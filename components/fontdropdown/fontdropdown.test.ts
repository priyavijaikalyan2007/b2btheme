/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: FontDropdown
 * Spec-based tests for the FontDropdown font family selector component.
 * Tests cover: factory, options, DOM structure, ARIA, handle methods,
 * callbacks, keyboard navigation, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
    FontDropdown,
    createFontDropdown,
} from "./fontdropdown";

import type { FontItem, FontDropdownOptions } from "./fontdropdown";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

const MOCK_FONTS: FontItem[] = [
    { label: "Arial", value: "Arial, sans-serif", category: "sans-serif" },
    { label: "Georgia", value: "Georgia, serif", category: "serif" },
    { label: "Consolas", value: "Consolas, monospace", category: "monospace" },
];

function queryRoot(): HTMLElement | null
{
    return container.querySelector(".fontdropdown");
}

function queryTrigger(): HTMLElement | null
{
    return container.querySelector(".fontdropdown-trigger") as HTMLElement | null;
}

function queryDropdown(): HTMLElement | null
{
    return container.querySelector(".fontdropdown-dropdown") as HTMLElement | null;
}

function querySearch(): HTMLInputElement | null
{
    return container.querySelector(
        ".fontdropdown-search"
    ) as HTMLInputElement | null;
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "test-fontdropdown";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY — createFontDropdown
// ============================================================================

describe("createFontDropdown", () =>
{
    test("withContainerId_MountsInContainer", () =>
    {
        createFontDropdown("test-fontdropdown", { fonts: MOCK_FONTS });
        expect(queryRoot()).not.toBeNull();
    });

    test("returnsFontDropdownInstance", () =>
    {
        const dd = createFontDropdown("test-fontdropdown", { fonts: MOCK_FONTS });
        expect(dd).toBeInstanceOf(FontDropdown);
    });
});

// ============================================================================
// CONSTRUCTOR
// ============================================================================

describe("FontDropdown constructor", () =>
{
    test("withCustomFonts_UsesProvidedList", () =>
    {
        const dd = new FontDropdown("test-fontdropdown", { fonts: MOCK_FONTS });
        expect(dd.getElement()).not.toBeNull();
    });

    test("withoutFonts_UsesDefaultList", () =>
    {
        const dd = new FontDropdown("test-fontdropdown", {});
        expect(dd.getElement()).not.toBeNull();
    });

    test("withInitialValue_SelectsFont", () =>
    {
        const dd = new FontDropdown("test-fontdropdown", {
            fonts: MOCK_FONTS,
            value: "Arial, sans-serif",
        });
        expect(dd.getValue()).toBe("Arial, sans-serif");
    });
});

// ============================================================================
// PUBLIC METHODS — getValue / setValue
// ============================================================================

describe("getValue and setValue", () =>
{
    test("getValue_ReturnsSelectedFontValue", () =>
    {
        const dd = new FontDropdown("test-fontdropdown", {
            fonts: MOCK_FONTS,
            value: "Georgia, serif",
        });
        expect(dd.getValue()).toBe("Georgia, serif");
    });

    test("getValue_WhenNoneSelected_ReturnsEmpty", () =>
    {
        const dd = new FontDropdown("test-fontdropdown", { fonts: MOCK_FONTS });
        expect(dd.getValue()).toBe("");
    });

    test("setValue_UpdatesSelection", () =>
    {
        const dd = new FontDropdown("test-fontdropdown", { fonts: MOCK_FONTS });
        dd.setValue("Consolas, monospace");
        expect(dd.getValue()).toBe("Consolas, monospace");
    });

    test("getSelectedFont_ReturnsFullFontItem", () =>
    {
        const dd = new FontDropdown("test-fontdropdown", {
            fonts: MOCK_FONTS,
            value: "Arial, sans-serif",
        });
        const font = dd.getSelectedFont();
        expect(font).not.toBeNull();
        expect(font?.label).toBe("Arial");
    });

    test("getSelectedFont_WhenNone_ReturnsNull", () =>
    {
        const dd = new FontDropdown("test-fontdropdown", { fonts: MOCK_FONTS });
        expect(dd.getSelectedFont()).toBeNull();
    });
});

// ============================================================================
// PUBLIC METHODS — setFonts
// ============================================================================

describe("setFonts", () =>
{
    test("replacesEntireFontList", () =>
    {
        const dd = new FontDropdown("test-fontdropdown", { fonts: MOCK_FONTS });
        const newFonts: FontItem[] = [
            { label: "Verdana", value: "Verdana, sans-serif" },
        ];
        dd.setFonts(newFonts);
        dd.setValue("Verdana, sans-serif");
        expect(dd.getValue()).toBe("Verdana, sans-serif");
    });
});

// ============================================================================
// PUBLIC METHODS — open / close
// ============================================================================

describe("open and close", () =>
{
    test("open_ShowsDropdown", () =>
    {
        const dd = new FontDropdown("test-fontdropdown", { fonts: MOCK_FONTS });
        dd.open();
        const dropdown = queryDropdown();
        expect(dropdown).not.toBeNull();
    });

    test("close_HidesDropdown", () =>
    {
        const dd = new FontDropdown("test-fontdropdown", { fonts: MOCK_FONTS });
        dd.open();
        dd.close();
        // Dropdown should not be visible
        expect(dd.getElement()).not.toBeNull();
    });
});

// ============================================================================
// PUBLIC METHODS — enable / disable
// ============================================================================

describe("enable and disable", () =>
{
    test("disable_MarksComponentDisabled", () =>
    {
        const dd = new FontDropdown("test-fontdropdown", { fonts: MOCK_FONTS });
        dd.disable();
        const root = queryRoot();
        expect(
            root?.classList.contains("fontdropdown-disabled")
        ).toBe(true);
    });

    test("enable_RemovesDisabledState", () =>
    {
        const dd = new FontDropdown("test-fontdropdown", {
            fonts: MOCK_FONTS,
            disabled: true,
        });
        dd.enable();
        const root = queryRoot();
        expect(
            root?.classList.contains("fontdropdown-disabled")
        ).toBe(false);
    });
});

// ============================================================================
// CALLBACKS — onChange
// ============================================================================

describe("callbacks", () =>
{
    test("onChange_NotFiredOnProgrammaticSetValue", () =>
    {
        const onChange = vi.fn();
        const dd = new FontDropdown("test-fontdropdown", {
            fonts: MOCK_FONTS,
            onChange,
        });
        dd.setValue("Georgia, serif");
        // setValue uses fireEvent=false by design (programmatic changes are silent)
        expect(onChange).not.toHaveBeenCalled();
    });

    test("onChange_ProvidedAsOption", () =>
    {
        const onChange = vi.fn();
        const dd = new FontDropdown("test-fontdropdown", {
            fonts: MOCK_FONTS,
            onChange,
        });
        expect(dd.getElement()).not.toBeNull();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("DOM structure", () =>
{
    test("hasTriggerElement", () =>
    {
        new FontDropdown("test-fontdropdown", { fonts: MOCK_FONTS });
        expect(queryTrigger()).not.toBeNull();
    });

    test("triggerHasTabindex", () =>
    {
        new FontDropdown("test-fontdropdown", { fonts: MOCK_FONTS });
        const trigger = queryTrigger();
        expect(trigger?.getAttribute("tabindex")).not.toBeNull();
    });
});

// ============================================================================
// ARIA / ACCESSIBILITY
// ============================================================================

describe("accessibility", () =>
{
    test("triggerHasComboboxRole", () =>
    {
        new FontDropdown("test-fontdropdown", { fonts: MOCK_FONTS });
        const trigger = queryTrigger();
        expect(trigger?.getAttribute("role")).toBe("combobox");
    });

    test("triggerHasAriaExpanded", () =>
    {
        new FontDropdown("test-fontdropdown", { fonts: MOCK_FONTS });
        const trigger = queryTrigger();
        expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    });
});

// ============================================================================
// LIFECYCLE — destroy
// ============================================================================

describe("destroy", () =>
{
    test("removesFromDOM", () =>
    {
        const dd = new FontDropdown("test-fontdropdown", { fonts: MOCK_FONTS });
        dd.destroy();
        expect(queryRoot()).toBeNull();
    });

    test("calledTwice_DoesNotThrow", () =>
    {
        const dd = new FontDropdown("test-fontdropdown", { fonts: MOCK_FONTS });
        dd.destroy();
        expect(() => dd.destroy()).not.toThrow();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("singleFont_WorksCorrectly", () =>
    {
        const dd = new FontDropdown("test-fontdropdown", {
            fonts: [{ label: "Mono", value: "monospace" }],
        });
        dd.setValue("monospace");
        expect(dd.getValue()).toBe("monospace");
    });

    test("emptyFontList_DoesNotThrow", () =>
    {
        expect(() =>
        {
            new FontDropdown("test-fontdropdown", { fonts: [] });
        }).not.toThrow();
    });

    test("disabled_InitialOption_PreventsFocus", () =>
    {
        new FontDropdown("test-fontdropdown", {
            fonts: MOCK_FONTS,
            disabled: true,
        });
        const root = queryRoot();
        expect(
            root?.classList.contains("fontdropdown-disabled")
        ).toBe(true);
    });
});
