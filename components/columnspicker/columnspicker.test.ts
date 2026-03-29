/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * Repository: pvk2007/theme
 * File GUID: d2a7c3e1-8f4b-4a19-bc6d-3e9f0a1b7c53
 * Created: 2026-03-24
 */

/**
 * Tests: ColumnsPicker
 * Vitest unit tests for the ColumnsPicker component.
 * Covers: factory, getValue/setValue, rendering, dropdown, keyboard,
 * custom link, setPresets, and destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createColumnsPicker } from "./columnspicker";
import type { ColumnsPickerOptions, ColumnPreset } from "./columnspicker";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function createContainer(): HTMLDivElement
{
    const el = document.createElement("div");
    el.id = "test-columnspicker-container";
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

function defaultOpts(
    overrides?: Partial<ColumnsPickerOptions>
): ColumnsPickerOptions
{
    return {
        container: "test-columnspicker-container",
        ...overrides,
    };
}

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
// FACTORY
// ============================================================================

describe("createColumnsPicker", () =>
{
    test("Factory_WithContainerId_ReturnsPicker", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        expect(picker).toBeDefined();
        expect(picker.getValue).toBeDefined();
        picker.destroy();
    });

    test("Factory_MountsElementInContainer", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
    });

    test("Factory_WithHTMLElement_MountsCorrectly", () =>
    {
        const picker = createColumnsPicker(defaultOpts({
            container: container,
        }));
        expect(container.querySelector(".columnspicker")).not.toBeNull();
        picker.destroy();
    });

    test("Factory_MissingContainer_ReturnsNullApi", () =>
    {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation();
        const picker = createColumnsPicker(defaultOpts({
            container: "nonexistent-id",
        }));
        expect(picker.getValue().name).toBe("One");
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
        picker.destroy();
    });
});

// ============================================================================
// RENDERING
// ============================================================================

describe("rendering", () =>
{
    test("Render_ShowsTriggerButton", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        const trigger = container.querySelector(".columnspicker-trigger");
        expect(trigger).not.toBeNull();
        picker.destroy();
    });

    test("Render_TriggerShowsDefaultLabel", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        const label = container.querySelector(".columnspicker-trigger-label");
        expect(label?.textContent).toBe("One");
        picker.destroy();
    });

    test("Render_PanelIsHiddenByDefault", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        // Panel is not in DOM until first open; verify it's not visible
        const panel = document.body.querySelector(".columnspicker-panel") as HTMLElement;
        expect(panel === null || panel?.style.display === "none").toBe(true);
        picker.destroy();
    });

    test("Render_ShowsFiveDefaultItems", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        picker.show();
        const items = document.body.querySelectorAll(".columnspicker-item");
        expect(items.length).toBe(5);
        picker.destroy();
    });

    test("Render_EachItemHasSvgThumbnail", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        picker.show();
        const svgs = document.body.querySelectorAll(".columnspicker-thumb");
        expect(svgs.length).toBe(5);
        picker.destroy();
    });

    test("Render_ShowCustomTrue_RendersCustomLink", () =>
    {
        const picker = createColumnsPicker(defaultOpts({ showCustom: true }));
        picker.show();
        const custom = document.body.querySelector(".columnspicker-custom");
        expect(custom).not.toBeNull();
        picker.destroy();
    });

    test("Render_ShowCustomFalse_HidesCustomLink", () =>
    {
        const picker = createColumnsPicker(defaultOpts({ showCustom: false }));
        picker.show();
        const custom = document.body.querySelector(".columnspicker-custom");
        expect(custom).toBeNull();
        picker.destroy();
    });
});

// ============================================================================
// getValue / setValue
// ============================================================================

describe("getValue and setValue", () =>
{
    test("getValue_DefaultValue_ReturnsOne", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        expect(picker.getValue().name).toBe("One");
        picker.destroy();
    });

    test("getValue_WithInitialValue_ReturnsSelected", () =>
    {
        const picker = createColumnsPicker(defaultOpts({ value: "Three" }));
        expect(picker.getValue().name).toBe("Three");
        picker.destroy();
    });

    test("setValue_ValidPreset_UpdatesValue", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        picker.setValue("Two");
        expect(picker.getValue().name).toBe("Two");
        picker.destroy();
    });

    test("setValue_InvalidPreset_LogsWarning", () =>
    {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation();
        const picker = createColumnsPicker(defaultOpts());
        picker.setValue("NonExistent");
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
        picker.destroy();
    });

    test("setValue_UpdatesTriggerLabel", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        picker.setValue("Left");
        const label = container.querySelector(".columnspicker-trigger-label");
        expect(label?.textContent).toBe("Left");
        picker.destroy();
    });
});

// ============================================================================
// DROPDOWN
// ============================================================================

describe("dropdown", () =>
{
    test("show_OpensPanel", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        picker.show();
        const panel = document.body.querySelector(".columnspicker-panel") as HTMLElement;
        expect(panel?.style.display).not.toBe("none");
        picker.destroy();
    });

    test("hide_ClosesPanel", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        picker.show();
        picker.hide();
        const panel = document.body.querySelector(".columnspicker-panel") as HTMLElement;
        expect(panel?.style.display).toBe("none");
        picker.destroy();
    });

    test("show_SetsAriaExpanded", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        picker.show();
        const trigger = container.querySelector(".columnspicker-trigger");
        expect(trigger?.getAttribute("aria-expanded")).toBe("true");
        picker.destroy();
    });
});

// ============================================================================
// SELECTION
// ============================================================================

describe("selection", () =>
{
    test("ClickItem_FiresOnChange", () =>
    {
        const onChange = vi.fn();
        const picker = createColumnsPicker(defaultOpts({ onChange }));
        picker.show();
        const items = document.body.querySelectorAll(".columnspicker-item");
        (items[1] as HTMLElement).click();
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ name: "Two" })
        );
        picker.destroy();
    });

    test("ClickItem_ClosesDropdown", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        picker.show();
        const items = document.body.querySelectorAll(".columnspicker-item");
        (items[1] as HTMLElement).click();
        const panel = document.body.querySelector(".columnspicker-panel") as HTMLElement;
        expect(panel?.style.display).toBe("none");
        picker.destroy();
    });

    test("ClickCustom_FiresOnCustom", () =>
    {
        const onCustom = vi.fn();
        const picker = createColumnsPicker(defaultOpts({ onCustom }));
        picker.show();
        const custom = document.body.querySelector(".columnspicker-custom") as HTMLElement;
        custom.click();
        expect(onCustom).toHaveBeenCalled();
        picker.destroy();
    });
});

// ============================================================================
// setPresets
// ============================================================================

describe("setPresets", () =>
{
    test("setPresets_ReplacesItems", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        const custom: ColumnPreset[] = [
            { name: "Alpha", columns: 4, widths: [1, 1, 1, 1] },
            { name: "Beta",  columns: 2, widths: [3, 1] },
        ];
        picker.setPresets(custom);
        picker.show();
        const items = document.body.querySelectorAll(".columnspicker-item");
        expect(items.length).toBe(2);
        picker.destroy();
    });

    test("setPresets_ResetsSelectionToFirst", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        picker.setPresets([
            { name: "Alpha", columns: 4 },
        ]);
        expect(picker.getValue().name).toBe("Alpha");
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
        const picker = createColumnsPicker(defaultOpts());
        expect(container.querySelector(".columnspicker")).not.toBeNull();
        picker.destroy();
        expect(container.querySelector(".columnspicker")).toBeNull();
    });

    test("destroy_CalledTwice_DoesNotThrow", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        picker.destroy();
        expect(() => picker.destroy()).not.toThrow();
    });

    test("destroy_GetElementReturnsNull", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        picker.destroy();
        expect(picker.getElement()).toBeNull();
    });
});

// ============================================================================
// CUSTOM PRESETS — ADDITIONAL COVERAGE
// ============================================================================

describe("custom presets via options", () =>
{
    test("CustomPresets_OverrideDefaults", () =>
    {
        const custom: ColumnPreset[] = [
            { name: "Quad", columns: 4, widths: [1, 1, 1, 1] },
        ];
        const picker = createColumnsPicker(defaultOpts({ presets: custom }));
        picker.show();
        const items = document.body.querySelectorAll(".columnspicker-item");
        expect(items.length).toBe(1);
        picker.destroy();
    });

    test("CustomPresets_InitialValueSelectsCorrectly", () =>
    {
        const custom: ColumnPreset[] = [
            { name: "Half", columns: 2, widths: [1, 1] },
            { name: "Third", columns: 3, widths: [1, 1, 1] },
        ];
        const picker = createColumnsPicker(defaultOpts({
            presets: custom,
            value: "Third",
        }));
        expect(picker.getValue().name).toBe("Third");
        picker.destroy();
    });
});

// ============================================================================
// COLUMN WIDTH RATIOS IN SVG THUMBNAILS
// ============================================================================

describe("column width ratios in SVG thumbnails", () =>
{
    test("Thumbnail_HasCorrectDimensions", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        picker.show();
        const svg = document.body.querySelector(".columnspicker-thumb");
        expect(svg?.getAttribute("width")).toBe("40");
        expect(svg?.getAttribute("height")).toBe("52");
        picker.destroy();
    });

    test("Thumbnail_TwoColumns_HasOneDivider", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        picker.show();
        // "Two" preset (2 columns) has 1 divider line
        const items = document.body.querySelectorAll(".columnspicker-item");
        const twoColItem = items[1]; // "Two" is second
        const svg = twoColItem.querySelector(".columnspicker-thumb");
        const dividers = svg?.querySelectorAll(".columnspicker-thumb-divider");
        expect(dividers?.length).toBe(1);
        picker.destroy();
    });

    test("Thumbnail_ThreeColumns_HasTwoDividers", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        picker.show();
        const items = document.body.querySelectorAll(".columnspicker-item");
        const threeColItem = items[2]; // "Three" is third
        const svg = threeColItem.querySelector(".columnspicker-thumb");
        const dividers = svg?.querySelectorAll(".columnspicker-thumb-divider");
        expect(dividers?.length).toBe(2);
        picker.destroy();
    });

    test("Thumbnail_OneColumn_HasNoDividers", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        picker.show();
        const items = document.body.querySelectorAll(".columnspicker-item");
        const oneColItem = items[0]; // "One" is first
        const svg = oneColItem.querySelector(".columnspicker-thumb");
        const dividers = svg?.querySelectorAll(".columnspicker-thumb-divider");
        expect(dividers?.length).toBe(0);
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
        const picker = createColumnsPicker(defaultOpts());
        picker.show();
        const panel = document.body.querySelector(".columnspicker-panel");
        expect(panel?.parentElement).toBe(document.body);
        picker.destroy();
    });

    test("Panel_HasFixedPosition", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        picker.show();
        const panel = document.body.querySelector(".columnspicker-panel") as HTMLElement;
        expect(panel?.style.position).toBe("fixed");
        picker.destroy();
    });

    test("Panel_HasZIndex1050", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        picker.show();
        const panel = document.body.querySelector(".columnspicker-panel") as HTMLElement;
        expect(panel?.style.zIndex).toBe("1050");
        picker.destroy();
    });
});

// ============================================================================
// KEYBOARD NAVIGATION — ADDITIONAL COVERAGE
// ============================================================================

describe("keyboard navigation", () =>
{
    test("Escape_ClosesDropdown", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        picker.show();
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Escape", bubbles: true,
        }));
        const panel = document.body.querySelector(".columnspicker-panel") as HTMLElement;
        expect(panel?.style.display).toBe("none");
        picker.destroy();
    });

    test("ArrowDown_MoveFocusToNextItem", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        picker.show();
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowDown", bubbles: true,
        }));
        // After ArrowDown, a focused class should appear on an item
        const panel = document.body.querySelector(".columnspicker-panel");
        const focused = panel?.querySelector(".columnspicker-item--focused");
        expect(focused).not.toBeNull();
        picker.destroy();
    });

    test("ArrowUp_MoveFocusToPreviousItem", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        picker.show();
        // Move down once then up once
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowDown", bubbles: true,
        }));
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowUp", bubbles: true,
        }));
        const panel = document.body.querySelector(".columnspicker-panel");
        const focused = panel?.querySelector(".columnspicker-item--focused");
        expect(focused).not.toBeNull();
        picker.destroy();
    });

    test("Enter_WhileOpen_ConfirmsFocusedItem", () =>
    {
        const onChange = vi.fn();
        const picker = createColumnsPicker(defaultOpts({ onChange }));
        picker.show();
        // Move down to "Two"
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowDown", bubbles: true,
        }));
        // Confirm selection
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Enter", bubbles: true,
        }));
        expect(onChange).toHaveBeenCalled();
        picker.destroy();
    });

    test("ArrowDown_OnTrigger_OpensDropdown", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        const trigger = container.querySelector(".columnspicker-trigger") as HTMLElement;
        trigger.dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowDown", bubbles: true,
        }));
        const panel = document.body.querySelector(".columnspicker-panel") as HTMLElement;
        expect(panel?.style.display).not.toBe("none");
        picker.destroy();
    });

    test("Space_OnTrigger_OpensDropdown", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        const trigger = container.querySelector(".columnspicker-trigger") as HTMLElement;
        trigger.dispatchEvent(new KeyboardEvent("keydown", {
            key: " ", bubbles: true,
        }));
        const panel = document.body.querySelector(".columnspicker-panel") as HTMLElement;
        expect(panel?.style.display).not.toBe("none");
        picker.destroy();
    });
});

// ============================================================================
// CLICK-OUTSIDE CLOSES
// ============================================================================

describe("click-outside closes", () =>
{
    test("ClickOutside_ClosesDropdown", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        picker.show();
        document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        const panel = document.body.querySelector(".columnspicker-panel") as HTMLElement;
        expect(panel?.style.display).toBe("none");
        picker.destroy();
    });
});

// ============================================================================
// ITEM SELECTION HIGHLIGHT
// ============================================================================

describe("item selection highlight", () =>
{
    test("SelectedItem_HasSelectedClass", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        picker.show();
        const selected = document.body.querySelector(".columnspicker-item--selected");
        expect(selected).not.toBeNull();
        picker.destroy();
    });

    test("ClickItem_UpdatesSelectedClass", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        picker.show();
        const items = document.body.querySelectorAll(".columnspicker-item");
        (items[2] as HTMLElement).click(); // "Three"
        picker.show();
        const selected = document.body.querySelector(".columnspicker-item--selected");
        expect(selected?.querySelector(".columnspicker-item-label")?.textContent).toBe("Three");
        picker.destroy();
    });

    test("SelectedItem_HasAriaSelectedTrue", () =>
    {
        const picker = createColumnsPicker(defaultOpts());
        picker.show();
        const selected = document.body.querySelector(".columnspicker-item--selected");
        expect(selected?.getAttribute("aria-selected")).toBe("true");
        picker.destroy();
    });
});
