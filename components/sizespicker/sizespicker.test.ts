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
 * Covers: factory, trigger button, default sizes, getValue/setValue,
 * onChange, category filtering, custom sizes, show/hide, destroy,
 * custom link, keyboard navigation, and panel positioning.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createSizesPicker, SizesPicker } from "./sizespicker";
import type { SizesPickerOptions, SizePreset, SizesPickerAPI } from "./sizespicker";

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
    // Clean up any panels appended to body
    const panels = document.querySelectorAll(".sizespicker-panel");
    for (const panel of panels)
    {
        panel.parentNode?.removeChild(panel);
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
// FACTORY -- createSizesPicker
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

    test("Factory_MountsTriggerInContainer", () =>
    {
        const picker = createSizesPicker(makeOptions());
        const root = container.querySelector(".sizespicker");
        expect(root).not.toBeNull();
        const trigger = root?.querySelector(".sizespicker-trigger");
        expect(trigger).not.toBeNull();
        picker.destroy();
    });

    test("Factory_WithHTMLElement_MountsCorrectly", () =>
    {
        const picker = createSizesPicker(makeOptions({
            container: container,
        }));
        const root = container.querySelector(".sizespicker");
        expect(root).not.toBeNull();
        picker.destroy();
    });

    test("Factory_TriggerShowsDefaultValue", () =>
    {
        const picker = createSizesPicker(makeOptions());
        const label = container.querySelector(".sizespicker-trigger-label");
        expect(label?.textContent).toBe("Letter");
        picker.destroy();
    });

    test("Factory_TriggerShowsCustomInitialValue", () =>
    {
        const picker = createSizesPicker(makeOptions({ value: "A4" }));
        const label = container.querySelector(".sizespicker-trigger-label");
        expect(label?.textContent).toBe("A4");
        picker.destroy();
    });
});

// ============================================================================
// TRIGGER BUTTON
// ============================================================================

describe("trigger button", () =>
{
    test("Trigger_HasChevronCaret", () =>
    {
        const picker = createSizesPicker(makeOptions());
        const caret = container.querySelector(".sizespicker-trigger-caret");
        expect(caret).not.toBeNull();
        picker.destroy();
    });

    test("Trigger_HasAriaAttributes", () =>
    {
        const picker = createSizesPicker(makeOptions());
        const trigger = container.querySelector(".sizespicker-trigger");
        expect(trigger?.getAttribute("aria-expanded")).toBe("false");
        expect(trigger?.getAttribute("aria-haspopup")).toBe("listbox");
        picker.destroy();
    });

    test("Trigger_Click_OpensPanel", () =>
    {
        const picker = createSizesPicker(makeOptions());
        const trigger = container.querySelector(".sizespicker-trigger") as HTMLElement;
        trigger.click();
        const panel = document.body.querySelector(".sizespicker-panel");
        expect(panel).not.toBeNull();
        expect(panel?.style.display).not.toBe("none");
        picker.destroy();
    });

    test("Trigger_DoubleClick_ClosesPanel", () =>
    {
        const picker = createSizesPicker(makeOptions());
        const trigger = container.querySelector(".sizespicker-trigger") as HTMLElement;
        trigger.click(); // open
        trigger.click(); // close
        const panel = document.body.querySelector(".sizespicker-panel");
        expect(panel?.style.display).toBe("none");
        picker.destroy();
    });

    test("Trigger_AriaExpandedUpdatesOnOpen", () =>
    {
        const picker = createSizesPicker(makeOptions());
        const trigger = container.querySelector(".sizespicker-trigger") as HTMLElement;
        trigger.click();
        expect(trigger.getAttribute("aria-expanded")).toBe("true");
        trigger.click();
        expect(trigger.getAttribute("aria-expanded")).toBe("false");
        picker.destroy();
    });
});

// ============================================================================
// DEFAULT SIZES (panel content)
// ============================================================================

describe("default sizes", () =>
{
    test("DefaultSizes_RendersNineItems", () =>
    {
        const picker = createSizesPicker(makeOptions());
        const trigger = container.querySelector(".sizespicker-trigger") as HTMLElement;
        trigger.click();
        const panel = document.body.querySelector(".sizespicker-panel");
        const items = panel?.querySelectorAll(".sizespicker-item");
        expect(items?.length).toBe(9);
        picker.destroy();
    });

    test("DefaultSizes_HasCategoryHeaders", () =>
    {
        const picker = createSizesPicker(makeOptions());
        const trigger = container.querySelector(".sizespicker-trigger") as HTMLElement;
        trigger.click();
        const panel = document.body.querySelector(".sizespicker-panel");
        const headers = panel?.querySelectorAll(".sizespicker-category");
        // Paper, Screen, Mobile, Tablet = 4 categories
        expect(headers?.length).toBe(4);
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
        const trigger = container.querySelector(".sizespicker-trigger") as HTMLElement;
        trigger.click();
        const panel = document.body.querySelector(".sizespicker-panel");
        const thumbs = panel?.querySelectorAll(".sizespicker-thumb");
        expect(thumbs?.length).toBe(9);
        picker.destroy();
    });

    test("DefaultSizes_EachItemHasDimensions", () =>
    {
        const picker = createSizesPicker(makeOptions());
        const trigger = container.querySelector(".sizespicker-trigger") as HTMLElement;
        trigger.click();
        const panel = document.body.querySelector(".sizespicker-panel");
        const dims = panel?.querySelectorAll(".sizespicker-dims");
        expect(dims?.length).toBe(9);
        // First item should be Letter dimensions
        expect(dims?.[0].textContent).toContain('8.5"');
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
        const trigger = container.querySelector(".sizespicker-trigger") as HTMLElement;
        trigger.click();
        picker.setValue("A4");
        const panel = document.body.querySelector(".sizespicker-panel");
        const active = panel?.querySelector(".sizespicker-item--active");
        expect(active?.getAttribute("data-size-name")).toBe("A4");
        picker.destroy();
    });

    test("setValue_UpdatesTriggerLabel", () =>
    {
        const picker = createSizesPicker(makeOptions());
        picker.setValue("A4");
        const label = container.querySelector(".sizespicker-trigger-label");
        expect(label?.textContent).toBe("A4");
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
        const trigger = container.querySelector(".sizespicker-trigger") as HTMLElement;
        trigger.click();
        const panel = document.body.querySelector(".sizespicker-panel");
        const items = panel?.querySelectorAll(".sizespicker-item");
        // Click the second item (Legal)
        (items?.[1] as HTMLElement).click();
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0].name).toBe("Legal");
        picker.destroy();
    });

    test("onChange_ItemClick_UpdatesTriggerLabel", () =>
    {
        const picker = createSizesPicker(makeOptions());
        const trigger = container.querySelector(".sizespicker-trigger") as HTMLElement;
        trigger.click();
        const panel = document.body.querySelector(".sizespicker-panel");
        const items = panel?.querySelectorAll(".sizespicker-item");
        (items?.[2] as HTMLElement).click(); // A4
        const label = container.querySelector(".sizespicker-trigger-label");
        expect(label?.textContent).toBe("A4");
        picker.destroy();
    });

    test("onChange_ItemClick_ClosesPanel", () =>
    {
        const picker = createSizesPicker(makeOptions());
        const trigger = container.querySelector(".sizespicker-trigger") as HTMLElement;
        trigger.click();
        const panel = document.body.querySelector(".sizespicker-panel");
        const items = panel?.querySelectorAll(".sizespicker-item");
        (items?.[1] as HTMLElement).click();
        expect(panel?.style.display).toBe("none");
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
        const trigger = container.querySelector(".sizespicker-trigger") as HTMLElement;
        trigger.click();
        const panel = document.body.querySelector(".sizespicker-panel");
        const items = panel?.querySelectorAll(".sizespicker-item");
        // Letter, Legal, A4, A5, B5 (JIS), Executive = 6
        expect(items?.length).toBe(6);
        picker.destroy();
    });

    test("CategoryFilter_Screen_ShowsOnlyScreenSizes", () =>
    {
        const picker = createSizesPicker(makeOptions({
            category: "Screen",
        }));
        const trigger = container.querySelector(".sizespicker-trigger") as HTMLElement;
        trigger.click();
        const panel = document.body.querySelector(".sizespicker-panel");
        const items = panel?.querySelectorAll(".sizespicker-item");
        expect(items?.length).toBe(1);
        picker.destroy();
    });

    test("CategoryFilter_CaseInsensitive_Works", () =>
    {
        const picker = createSizesPicker(makeOptions({
            category: "paper",
        }));
        const trigger = container.querySelector(".sizespicker-trigger") as HTMLElement;
        trigger.click();
        const panel = document.body.querySelector(".sizespicker-panel");
        const items = panel?.querySelectorAll(".sizespicker-item");
        expect(items?.length).toBe(6);
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
        const trigger = container.querySelector(".sizespicker-trigger") as HTMLElement;
        trigger.click();
        const panel = document.body.querySelector(".sizespicker-panel");
        const items = panel?.querySelectorAll(".sizespicker-item");
        expect(items?.length).toBe(3);
        picker.destroy();
    });

    test("setSizes_ReplacesExistingSizes", () =>
    {
        const picker = createSizesPicker(makeOptions());
        picker.setSizes(CUSTOM_SIZES);
        const trigger = container.querySelector(".sizespicker-trigger") as HTMLElement;
        trigger.click();
        const panel = document.body.querySelector(".sizespicker-panel");
        const items = panel?.querySelectorAll(".sizespicker-item");
        expect(items?.length).toBe(3);
        picker.destroy();
    });

    test("setSizes_CurrentSelectionLost_SelectsFirst", () =>
    {
        const picker = createSizesPicker(makeOptions({ value: "Letter" }));
        picker.setSizes(CUSTOM_SIZES);
        expect(picker.getValue().name).toBe("Poster");
        picker.destroy();
    });

    test("setSizes_UpdatesTriggerLabel", () =>
    {
        const picker = createSizesPicker(makeOptions({ value: "Letter" }));
        picker.setSizes(CUSTOM_SIZES);
        const label = container.querySelector(".sizespicker-trigger-label");
        expect(label?.textContent).toBe("Poster");
        picker.destroy();
    });
});

// ============================================================================
// SHOW / HIDE (public API)
// ============================================================================

describe("show and hide", () =>
{
    test("show_OpensPanel", () =>
    {
        const picker = createSizesPicker(makeOptions());
        picker.show();
        const panel = document.body.querySelector(".sizespicker-panel");
        expect(panel).not.toBeNull();
        expect(panel?.style.display).not.toBe("none");
        picker.destroy();
    });

    test("hide_ClosesPanel", () =>
    {
        const picker = createSizesPicker(makeOptions());
        picker.show();
        picker.hide();
        const panel = document.body.querySelector(".sizespicker-panel");
        expect(panel?.style.display).toBe("none");
        picker.destroy();
    });

    test("show_AfterHide_ReOpensPanel", () =>
    {
        const picker = createSizesPicker(makeOptions());
        picker.show();
        picker.hide();
        picker.show();
        const panel = document.body.querySelector(".sizespicker-panel");
        expect(panel?.style.display).not.toBe("none");
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
        const trigger = container.querySelector(".sizespicker-trigger") as HTMLElement;
        trigger.click();
        const panel = document.body.querySelector(".sizespicker-panel");
        const link = panel?.querySelector(".sizespicker-custom");
        expect(link).not.toBeNull();
        expect(link?.textContent).toContain("More Paper Sizes");
        picker.destroy();
    });

    test("ShowCustomFalse_HidesCustomLink", () =>
    {
        const picker = createSizesPicker(makeOptions({ showCustom: false }));
        const trigger = container.querySelector(".sizespicker-trigger") as HTMLElement;
        trigger.click();
        const panel = document.body.querySelector(".sizespicker-panel");
        const link = panel?.querySelector(".sizespicker-custom");
        expect(link).toBeNull();
        picker.destroy();
    });

    test("CustomLink_Click_FiresOnCustom", () =>
    {
        const onCustom = vi.fn();
        const picker = createSizesPicker(makeOptions({ onCustom }));
        const trigger = container.querySelector(".sizespicker-trigger") as HTMLElement;
        trigger.click();
        const panel = document.body.querySelector(".sizespicker-panel");
        const link = panel?.querySelector(".sizespicker-custom") as HTMLElement;
        link.click();
        expect(onCustom).toHaveBeenCalledTimes(1);
        picker.destroy();
    });

    test("CustomLink_Click_ClosesPanel", () =>
    {
        const onCustom = vi.fn();
        const picker = createSizesPicker(makeOptions({ onCustom }));
        const trigger = container.querySelector(".sizespicker-trigger") as HTMLElement;
        trigger.click();
        const panel = document.body.querySelector(".sizespicker-panel");
        const link = panel?.querySelector(".sizespicker-custom") as HTMLElement;
        link.click();
        expect(panel?.style.display).toBe("none");
        picker.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("destroy", () =>
{
    test("destroy_RemovesTriggerFromDOM", () =>
    {
        const picker = createSizesPicker(makeOptions());
        expect(container.querySelector(".sizespicker")).not.toBeNull();
        picker.destroy();
        expect(container.querySelector(".sizespicker")).toBeNull();
    });

    test("destroy_RemovesPanelFromDOM", () =>
    {
        const picker = createSizesPicker(makeOptions());
        picker.show();
        expect(document.body.querySelector(".sizespicker-panel")).not.toBeNull();
        picker.destroy();
        expect(document.body.querySelector(".sizespicker-panel")).toBeNull();
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

// ============================================================================
// KEYBOARD NAVIGATION
// ============================================================================

describe("keyboard navigation", () =>
{
    test("EscapeKey_ClosesPanel", () =>
    {
        const picker = createSizesPicker(makeOptions());
        picker.show();
        const panel = document.body.querySelector(".sizespicker-panel");

        const event = new KeyboardEvent("keydown", {
            key: "Escape",
            bubbles: true,
        });
        document.dispatchEvent(event);

        expect(panel?.style.display).toBe("none");
        picker.destroy();
    });

    test("Enter_OnItem_SelectsSize", () =>
    {
        const onChange = vi.fn();
        const picker = createSizesPicker(makeOptions({ onChange }));
        picker.show();
        const panel = document.body.querySelector(".sizespicker-panel");
        const items = panel?.querySelectorAll(".sizespicker-item");
        const secondItem = items?.[1] as HTMLElement;
        secondItem.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Enter", bubbles: true,
        }));
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0].name).toBe("Legal");
        picker.destroy();
    });

    test("Space_OnItem_SelectsSize", () =>
    {
        const onChange = vi.fn();
        const picker = createSizesPicker(makeOptions({ onChange }));
        picker.show();
        const panel = document.body.querySelector(".sizespicker-panel");
        const items = panel?.querySelectorAll(".sizespicker-item");
        const thirdItem = items?.[2] as HTMLElement;
        thirdItem.dispatchEvent(new KeyboardEvent("keydown", {
            key: " ", bubbles: true,
        }));
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0].name).toBe("A4");
        picker.destroy();
    });

    test("Escape_OnItem_ClosesPanel", () =>
    {
        const picker = createSizesPicker(makeOptions());
        picker.show();
        const panel = document.body.querySelector(".sizespicker-panel");
        const items = panel?.querySelectorAll(".sizespicker-item");
        const firstItem = items?.[0] as HTMLElement;
        firstItem.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Escape", bubbles: true,
        }));
        expect(panel?.style.display).toBe("none");
        picker.destroy();
    });
});

// ============================================================================
// CATEGORY HEADERS IN PANEL
// ============================================================================

describe("category headers in panel", () =>
{
    test("CategoryHeaders_HaveRolePresentation", () =>
    {
        const picker = createSizesPicker(makeOptions());
        picker.show();
        const panel = document.body.querySelector(".sizespicker-panel");
        const headers = panel?.querySelectorAll(".sizespicker-category");
        for (const header of headers!)
        {
            expect(header.getAttribute("role")).toBe("presentation");
        }
        picker.destroy();
    });

    test("CategoryHeaders_MatchExpectedNames", () =>
    {
        const picker = createSizesPicker(makeOptions());
        picker.show();
        const panel = document.body.querySelector(".sizespicker-panel");
        const headers = panel?.querySelectorAll(".sizespicker-category");
        const names = Array.from(headers!).map((h) => h.textContent);
        expect(names).toContain("Paper");
        expect(names).toContain("Screen");
        picker.destroy();
    });
});

// ============================================================================
// SVG PROPORTIONAL THUMBNAILS
// ============================================================================

describe("SVG proportional thumbnails", () =>
{
    test("Thumbnail_HasProportionalDimensions", () =>
    {
        const picker = createSizesPicker(makeOptions());
        picker.show();
        const panel = document.body.querySelector(".sizespicker-panel");
        const thumbs = panel?.querySelectorAll(".sizespicker-thumb");
        // Each thumb should have width and height
        for (const thumb of thumbs!)
        {
            const w = Number(thumb.getAttribute("width"));
            const h = Number(thumb.getAttribute("height"));
            expect(w).toBeGreaterThan(0);
            expect(h).toBeGreaterThan(0);
        }
        picker.destroy();
    });

    test("Thumbnail_ContainsPageRect", () =>
    {
        const picker = createSizesPicker(makeOptions());
        picker.show();
        const panel = document.body.querySelector(".sizespicker-panel");
        const thumb = panel?.querySelector(".sizespicker-thumb");
        const rect = thumb?.querySelector("rect");
        expect(rect).not.toBeNull();
        picker.destroy();
    });
});

// ============================================================================
// PANEL BODY-APPEND POSITIONING
// ============================================================================

describe("panel body-append positioning", () =>
{
    test("Panel_AppendedToBody_NotToRoot", () =>
    {
        const picker = createSizesPicker(makeOptions());
        picker.show();
        const panel = document.body.querySelector(".sizespicker-panel");
        expect(panel?.parentElement).toBe(document.body);
        picker.destroy();
    });

    test("Panel_HasFixedPosition", () =>
    {
        const picker = createSizesPicker(makeOptions());
        picker.show();
        const panel = document.body.querySelector(".sizespicker-panel") as HTMLElement;
        expect(panel?.style.position).toBe("fixed");
        picker.destroy();
    });

    test("Panel_HasZIndex1050", () =>
    {
        const picker = createSizesPicker(makeOptions());
        picker.show();
        const panel = document.body.querySelector(".sizespicker-panel") as HTMLElement;
        expect(panel?.style.zIndex).toBe("1050");
        picker.destroy();
    });
});

// ============================================================================
// setSizes DYNAMIC UPDATE
// ============================================================================

describe("setSizes dynamic update", () =>
{
    test("setSizes_KeepsSelectionIfStillExists", () =>
    {
        const picker = createSizesPicker(makeOptions({ value: "A4" }));
        const newSizes: SizePreset[] = [
            { name: "A4", width: 794, height: 1123, category: "Paper",
                displayWidth: '8.27"', displayHeight: '11.69"' },
            { name: "Custom", width: 100, height: 200, category: "Other" },
        ];
        picker.setSizes(newSizes);
        expect(picker.getValue().name).toBe("A4");
        picker.destroy();
    });

    test("setSizes_RebuildsCategoryHeaders", () =>
    {
        const picker = createSizesPicker(makeOptions());
        const newSizes: SizePreset[] = [
            { name: "X", width: 100, height: 200, category: "Custom1" },
            { name: "Y", width: 300, height: 400, category: "Custom2" },
        ];
        picker.setSizes(newSizes);
        picker.show();
        const panel = document.body.querySelector(".sizespicker-panel");
        const headers = panel?.querySelectorAll(".sizespicker-category");
        const names = Array.from(headers!).map((h) => h.textContent);
        expect(names).toContain("Custom1");
        expect(names).toContain("Custom2");
        picker.destroy();
    });
});

// ============================================================================
// CLICK-OUTSIDE CLOSES
// ============================================================================

describe("click-outside closes", () =>
{
    test("ClickOutside_ClosesPanel", () =>
    {
        const picker = createSizesPicker(makeOptions());
        picker.show();
        document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        const panel = document.body.querySelector(".sizespicker-panel") as HTMLElement;
        expect(panel?.style.display).toBe("none");
        picker.destroy();
    });
});
