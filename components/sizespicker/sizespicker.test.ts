/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * Repository: pvk2007/theme
 * File GUID: c5f9e1a3-7d46-4c0b-bf8g-3e0f5c9d7a24
 * Created: 2026-03-24
 */

/**
 * Tests: SizesPicker
 * Comprehensive Vitest unit tests for the SizesPicker component.
 * Covers: factory, default sizes, getValue/setValue, onChange,
 * category filtering, custom sizes, show/hide, and destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createSizesPicker } from "./sizespicker";
import type { SizesPickerOptions, SizePreset, SizesPicker } from "./sizespicker";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function createContainer(): HTMLDivElement
{
    const el = document.createElement("div");
    el.id = "test-sizespicker-container";
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

function makeOptions(overrides?: Partial<SizesPickerOptions>): SizesPickerOptions
{
    return {
        container: "test-sizespicker-container",
        ...overrides,
    };
}

const CUSTOM_SIZES: SizePreset[] =
[
    { name: "Poster", width: 2400, height: 3600, category: "Print", displayWidth: '25"', displayHeight: '37.5"' },
    { name: "Banner", width: 4800, height: 1200, category: "Print", displayWidth: '50"', displayHeight: '12.5"' },
    { name: "Card", width: 336, height: 216, category: "Small", displayWidth: '3.5"', displayHeight: '2.25"' },
];

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = createContainer();
});

afterEach(() =>
{
    removeContainer();
});

// ============================================================================
// FACTORY — createSizesPicker
// ============================================================================

describe("createSizesPicker", () =>
{
    test("Factory_WithContainerId_ReturnsPicker", () =>
    {
        const picker = createSizesPicker(makeOptions());
        expect(picker).toBeDefined();
        expect(picker.getValue).toBeDefined();
        picker.destroy();
    });

    test("Factory_MountsElementInContainer", () =>
    {
        const picker = createSizesPicker(makeOptions());
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
    });

    test("Factory_WithHTMLElement_MountsCorrectly", () =>
    {
        const picker = createSizesPicker(makeOptions({
            container: container,
        }));
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
    });
});

// ============================================================================
// DEFAULT SIZES
// ============================================================================

describe("default sizes", () =>
{
    test("DefaultSizes_RendersNineItems", () =>
    {
        const picker = createSizesPicker(makeOptions());
        const el = picker.getElement();
        const items = el.querySelectorAll(".sizespicker-item");
        expect(items.length).toBe(9);
        picker.destroy();
    });

    test("DefaultSizes_HasCategoryHeaders", () =>
    {
        const picker = createSizesPicker(makeOptions());
        const el = picker.getElement();
        const headers = el.querySelectorAll(".sizespicker-category");
        // Paper, Screen, Mobile, Tablet = 4 categories
        expect(headers.length).toBe(4);
        picker.destroy();
    });

    test("DefaultSizes_FirstDefaultIsLetter", () =>
    {
        const picker = createSizesPicker(makeOptions());
        expect(picker.getValue().name).toBe("Letter");
        picker.destroy();
    });

    test("DefaultSizes_EachItemHasThumbnail", () =>
    {
        const picker = createSizesPicker(makeOptions());
        const el = picker.getElement();
        const thumbs = el.querySelectorAll(".sizespicker-thumb");
        expect(thumbs.length).toBe(9);
        picker.destroy();
    });

    test("DefaultSizes_EachItemHasDimensions", () =>
    {
        const picker = createSizesPicker(makeOptions());
        const el = picker.getElement();
        const dims = el.querySelectorAll(".sizespicker-dims");
        expect(dims.length).toBe(9);
        // First item should be Letter dimensions
        expect(dims[0].textContent).toContain('8.5"');
        picker.destroy();
    });
});

// ============================================================================
// getValue / setValue
// ============================================================================

describe("getValue and setValue", () =>
{
    test("getValue_ReturnsCurrentSelection", () =>
    {
        const picker = createSizesPicker(makeOptions({ value: "A4" }));
        expect(picker.getValue().name).toBe("A4");
        picker.destroy();
    });

    test("setValue_ValidName_UpdatesSelection", () =>
    {
        const picker = createSizesPicker(makeOptions());
        picker.setValue("Legal");
        expect(picker.getValue().name).toBe("Legal");
        picker.destroy();
    });

    test("setValue_CaseInsensitive_FindsMatch", () =>
    {
        const picker = createSizesPicker(makeOptions());
        picker.setValue("a4");
        expect(picker.getValue().name).toBe("A4");
        picker.destroy();
    });

    test("setValue_InvalidName_KeepsPrevious", () =>
    {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const picker = createSizesPicker(makeOptions({ value: "Letter" }));
        picker.setValue("NonExistent");
        expect(picker.getValue().name).toBe("Letter");
        warnSpy.mockRestore();
        picker.destroy();
    });

    test("setValue_UpdatesDOMActiveClass", () =>
    {
        const picker = createSizesPicker(makeOptions());
        picker.setValue("A4");
        const el = picker.getElement();
        const active = el.querySelector(".sizespicker-item--active");
        expect(active?.getAttribute("data-size-name")).toBe("A4");
        picker.destroy();
    });

    test("getValue_ReturnsACopy", () =>
    {
        const picker = createSizesPicker(makeOptions());
        const val1 = picker.getValue();
        const val2 = picker.getValue();
        expect(val1).toEqual(val2);
        expect(val1).not.toBe(val2);
        picker.destroy();
    });
});

// ============================================================================
// onChange CALLBACK
// ============================================================================

describe("onChange callback", () =>
{
    test("onChange_ItemClick_FiresCallback", () =>
    {
        const onChange = vi.fn();
        const picker = createSizesPicker(makeOptions({ onChange }));
        const el = picker.getElement();
        const items = el.querySelectorAll(".sizespicker-item");
        // Click the second item (Legal)
        (items[1] as HTMLElement).click();
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0].name).toBe("Legal");
        picker.destroy();
    });

    test("onChange_SetValue_DoesNotFireCallback", () =>
    {
        const onChange = vi.fn();
        const picker = createSizesPicker(makeOptions({ onChange }));
        picker.setValue("A4");
        expect(onChange).not.toHaveBeenCalled();
        picker.destroy();
    });
});

// ============================================================================
// CATEGORY FILTERING
// ============================================================================

describe("category filtering", () =>
{
    test("CategoryFilter_Paper_ShowsOnlyPaperSizes", () =>
    {
        const picker = createSizesPicker(makeOptions({
            category: "Paper",
        }));
        const el = picker.getElement();
        const items = el.querySelectorAll(".sizespicker-item");
        // Letter, Legal, A4, A5, B5 (JIS), Executive = 6
        expect(items.length).toBe(6);
        picker.destroy();
    });

    test("CategoryFilter_Screen_ShowsOnlyScreenSizes", () =>
    {
        const picker = createSizesPicker(makeOptions({
            category: "Screen",
        }));
        const el = picker.getElement();
        const items = el.querySelectorAll(".sizespicker-item");
        expect(items.length).toBe(1);
        picker.destroy();
    });

    test("CategoryFilter_CaseInsensitive_Works", () =>
    {
        const picker = createSizesPicker(makeOptions({
            category: "paper",
        }));
        const el = picker.getElement();
        const items = el.querySelectorAll(".sizespicker-item");
        expect(items.length).toBe(6);
        picker.destroy();
    });
});

// ============================================================================
// CUSTOM SIZES
// ============================================================================

describe("custom sizes", () =>
{
    test("CustomSizes_OverridesDefaults", () =>
    {
        const picker = createSizesPicker(makeOptions({
            sizes: CUSTOM_SIZES,
        }));
        const el = picker.getElement();
        const items = el.querySelectorAll(".sizespicker-item");
        expect(items.length).toBe(3);
        picker.destroy();
    });

    test("setSizes_ReplacesExistingSizes", () =>
    {
        const picker = createSizesPicker(makeOptions());
        picker.setSizes(CUSTOM_SIZES);
        const el = picker.getElement();
        const items = el.querySelectorAll(".sizespicker-item");
        expect(items.length).toBe(3);
        picker.destroy();
    });

    test("setSizes_CurrentSelectionLost_SelectsFirst", () =>
    {
        const picker = createSizesPicker(makeOptions({ value: "Letter" }));
        picker.setSizes(CUSTOM_SIZES);
        expect(picker.getValue().name).toBe("Poster");
        picker.destroy();
    });
});

// ============================================================================
// SHOW / HIDE
// ============================================================================

describe("show and hide", () =>
{
    test("hide_HidesRootElement", () =>
    {
        const picker = createSizesPicker(makeOptions());
        picker.hide();
        const el = picker.getElement();
        expect(el.style.display).toBe("none");
        picker.destroy();
    });

    test("show_AfterHide_RestoresVisibility", () =>
    {
        const picker = createSizesPicker(makeOptions());
        picker.hide();
        picker.show();
        const el = picker.getElement();
        expect(el.style.display).toBe("");
        picker.destroy();
    });
});

// ============================================================================
// CUSTOM LINK
// ============================================================================

describe("custom link", () =>
{
    test("ShowCustomTrue_RendersCustomLink", () =>
    {
        const picker = createSizesPicker(makeOptions({ showCustom: true }));
        const el = picker.getElement();
        const link = el.querySelector(".sizespicker-custom");
        expect(link).not.toBeNull();
        expect(link?.textContent).toContain("More Paper Sizes");
        picker.destroy();
    });

    test("ShowCustomFalse_HidesCustomLink", () =>
    {
        const picker = createSizesPicker(makeOptions({ showCustom: false }));
        const el = picker.getElement();
        const link = el.querySelector(".sizespicker-custom");
        expect(link).toBeNull();
        picker.destroy();
    });

    test("CustomLink_Click_FiresOnCustom", () =>
    {
        const onCustom = vi.fn();
        const picker = createSizesPicker(makeOptions({ onCustom }));
        const el = picker.getElement();
        const link = el.querySelector(".sizespicker-custom") as HTMLElement;
        link.click();
        expect(onCustom).toHaveBeenCalledTimes(1);
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
        const picker = createSizesPicker(makeOptions());
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
        expect(container.querySelector(".sizespicker")).toBeNull();
    });

    test("destroy_CalledTwice_DoesNotThrow", () =>
    {
        const picker = createSizesPicker(makeOptions());
        picker.destroy();
        expect(() => picker.destroy()).not.toThrow();
    });

    test("destroy_GetElementReturnsNull", () =>
    {
        const picker = createSizesPicker(makeOptions());
        picker.destroy();
        expect(picker.getElement()).toBeNull();
    });
});
