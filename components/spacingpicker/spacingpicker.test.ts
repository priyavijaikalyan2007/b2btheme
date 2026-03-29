/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * Repository: pvk2007/theme
 * File GUID: e3b8d4f2-9a5c-4b2a-cd7e-4f0a1b2c8d64
 * Created: 2026-03-24
 */

/**
 * Tests: SpacingPicker
 * Vitest unit tests for the SpacingPicker component.
 * Covers: factory, getValue/setValue, rendering, dropdown, keyboard,
 * custom link, setPresets, and destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createSpacingPicker } from "./spacingpicker";
import type { SpacingPickerOptions, SpacingPreset } from "./spacingpicker";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function createContainer(): HTMLDivElement
{
    const el = document.createElement("div");
    el.id = "test-spacingpicker-container";
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
    overrides?: Partial<SpacingPickerOptions>
): SpacingPickerOptions
{
    return {
        container: "test-spacingpicker-container",
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

describe("createSpacingPicker", () =>
{
    test("Factory_WithContainerId_ReturnsPicker", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        expect(picker).toBeDefined();
        expect(picker.getValue).toBeDefined();
        picker.destroy();
    });

    test("Factory_MountsElementInContainer", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
    });

    test("Factory_WithHTMLElement_MountsCorrectly", () =>
    {
        const picker = createSpacingPicker(defaultOpts({
            container: container,
        }));
        expect(container.querySelector(".spacingpicker")).not.toBeNull();
        picker.destroy();
    });

    test("Factory_MissingContainer_ReturnsNullApi", () =>
    {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation();
        const picker = createSpacingPicker(defaultOpts({
            container: "nonexistent-id",
        }));
        expect(picker.getValue().name).toBe("1.15");
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
        const picker = createSpacingPicker(defaultOpts());
        const trigger = container.querySelector(".spacingpicker-trigger");
        expect(trigger).not.toBeNull();
        picker.destroy();
    });

    test("Render_TriggerShowsDefaultLabel", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        const label = container.querySelector(".spacingpicker-trigger-label");
        expect(label?.textContent).toBe("1.15");
        picker.destroy();
    });

    test("Render_PanelIsHiddenByDefault", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        // Panel is not in DOM until first open; verify it's not visible
        const panel = document.body.querySelector(".spacingpicker-panel") as HTMLElement;
        expect(panel === null || panel?.style.display === "none").toBe(true);
        picker.destroy();
    });

    test("Render_ShowsSixDefaultItems", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        picker.show();
        const items = document.body.querySelectorAll(".spacingpicker-item");
        expect(items.length).toBe(6);
        picker.destroy();
    });

    test("Render_EachItemHasSvgThumbnail", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        picker.show();
        const svgs = document.body.querySelectorAll(".spacingpicker-thumb");
        expect(svgs.length).toBe(6);
        picker.destroy();
    });

    test("Render_ShowCustomTrue_RendersCustomLink", () =>
    {
        const picker = createSpacingPicker(defaultOpts({ showCustom: true }));
        picker.show();
        const custom = document.body.querySelector(".spacingpicker-custom");
        expect(custom).not.toBeNull();
        picker.destroy();
    });

    test("Render_ShowCustomFalse_HidesCustomLink", () =>
    {
        const picker = createSpacingPicker(defaultOpts({ showCustom: false }));
        picker.show();
        const custom = document.body.querySelector(".spacingpicker-custom");
        expect(custom).toBeNull();
        picker.destroy();
    });
});

// ============================================================================
// getValue / setValue
// ============================================================================

describe("getValue and setValue", () =>
{
    test("getValue_DefaultValue_Returns115", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        expect(picker.getValue().name).toBe("1.15");
        picker.destroy();
    });

    test("getValue_WithInitialValue_ReturnsSelected", () =>
    {
        const picker = createSpacingPicker(defaultOpts({ value: "Double" }));
        expect(picker.getValue().name).toBe("Double");
        picker.destroy();
    });

    test("getValue_ReturnsLineHeight", () =>
    {
        const picker = createSpacingPicker(defaultOpts({ value: "Double" }));
        expect(picker.getValue().lineHeight).toBe(2.0);
        picker.destroy();
    });

    test("setValue_ValidPreset_UpdatesValue", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        picker.setValue("Single");
        expect(picker.getValue().name).toBe("Single");
        picker.destroy();
    });

    test("setValue_InvalidPreset_LogsWarning", () =>
    {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation();
        const picker = createSpacingPicker(defaultOpts());
        picker.setValue("NonExistent");
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
        picker.destroy();
    });

    test("setValue_UpdatesTriggerLabel", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        picker.setValue("Compact");
        const label = container.querySelector(".spacingpicker-trigger-label");
        expect(label?.textContent).toBe("Compact");
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
        const picker = createSpacingPicker(defaultOpts());
        picker.show();
        const panel = document.body.querySelector(".spacingpicker-panel") as HTMLElement;
        expect(panel?.style.display).not.toBe("none");
        picker.destroy();
    });

    test("hide_ClosesPanel", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        picker.show();
        picker.hide();
        const panel = document.body.querySelector(".spacingpicker-panel") as HTMLElement;
        expect(panel?.style.display).toBe("none");
        picker.destroy();
    });

    test("show_SetsAriaExpanded", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        picker.show();
        const trigger = container.querySelector(".spacingpicker-trigger");
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
        const picker = createSpacingPicker(defaultOpts({ onChange }));
        picker.show();
        const items = document.body.querySelectorAll(".spacingpicker-item");
        (items[3] as HTMLElement).click();
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ name: "Double" })
        );
        picker.destroy();
    });

    test("ClickItem_ClosesDropdown", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        picker.show();
        const items = document.body.querySelectorAll(".spacingpicker-item");
        (items[0] as HTMLElement).click();
        const panel = document.body.querySelector(".spacingpicker-panel") as HTMLElement;
        expect(panel?.style.display).toBe("none");
        picker.destroy();
    });

    test("ClickCustom_FiresOnCustom", () =>
    {
        const onCustom = vi.fn();
        const picker = createSpacingPicker(defaultOpts({ onCustom }));
        picker.show();
        const custom = document.body.querySelector(".spacingpicker-custom") as HTMLElement;
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
        const picker = createSpacingPicker(defaultOpts());
        const custom: SpacingPreset[] = [
            { name: "Tight", lineHeight: 0.8 },
            { name: "Loose", lineHeight: 2.5 },
        ];
        picker.setPresets(custom);
        picker.show();
        const items = document.body.querySelectorAll(".spacingpicker-item");
        expect(items.length).toBe(2);
        picker.destroy();
    });

    test("setPresets_ResetsSelectionToFirst", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        picker.setPresets([
            { name: "Custom", lineHeight: 1.8 },
        ]);
        expect(picker.getValue().name).toBe("Custom");
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
        const picker = createSpacingPicker(defaultOpts());
        expect(container.querySelector(".spacingpicker")).not.toBeNull();
        picker.destroy();
        expect(container.querySelector(".spacingpicker")).toBeNull();
    });

    test("destroy_CalledTwice_DoesNotThrow", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        picker.destroy();
        expect(() => picker.destroy()).not.toThrow();
    });

    test("destroy_GetElementReturnsNull", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        picker.destroy();
        expect(picker.getElement()).toBeNull();
    });
});

// ============================================================================
// CUSTOM PRESETS VIA OPTIONS — ADDITIONAL COVERAGE
// ============================================================================

describe("custom presets via options", () =>
{
    test("CustomPresets_OverrideDefaults", () =>
    {
        const custom: SpacingPreset[] = [
            { name: "Tight", lineHeight: 0.9 },
            { name: "Loose", lineHeight: 2.5 },
        ];
        const picker = createSpacingPicker(defaultOpts({ presets: custom }));
        picker.show();
        const items = document.body.querySelectorAll(".spacingpicker-item");
        expect(items.length).toBe(2);
        picker.destroy();
    });

    test("CustomPresets_InitialValueSelectsCorrectly", () =>
    {
        const custom: SpacingPreset[] = [
            { name: "Tight", lineHeight: 0.9 },
            { name: "Airy", lineHeight: 3.0 },
        ];
        const picker = createSpacingPicker(defaultOpts({
            presets: custom,
            value: "Airy",
        }));
        expect(picker.getValue().name).toBe("Airy");
        picker.destroy();
    });
});

// ============================================================================
// SVG THUMBNAIL LINE SPACING PROPORTIONS
// ============================================================================

describe("SVG thumbnail line spacing proportions", () =>
{
    test("Thumbnail_HasCorrectDimensions", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        picker.show();
        const svg = document.body.querySelector(".spacingpicker-thumb");
        expect(svg?.getAttribute("width")).toBe("40");
        expect(svg?.getAttribute("height")).toBe("40");
        picker.destroy();
    });

    test("Thumbnail_ContainsHorizontalLines", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        picker.show();
        const svg = document.body.querySelector(".spacingpicker-thumb");
        const lines = svg?.querySelectorAll(".spacingpicker-thumb-line");
        expect(lines?.length).toBeGreaterThan(0);
        picker.destroy();
    });

    test("Thumbnail_SingleSpacing_HasMoreLinesThanDouble", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        picker.show();
        const items = document.body.querySelectorAll(".spacingpicker-item");
        // "Single" is index 0, "Double" is index 3
        const singleSvg = items[0].querySelector(".spacingpicker-thumb");
        const doubleSvg = items[3].querySelector(".spacingpicker-thumb");
        const singleLines = singleSvg?.querySelectorAll(".spacingpicker-thumb-line");
        const doubleLines = doubleSvg?.querySelectorAll(".spacingpicker-thumb-line");
        expect(singleLines!.length).toBeGreaterThan(doubleLines!.length);
        picker.destroy();
    });

    test("Thumbnail_ContainsThumbBox", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        picker.show();
        const svg = document.body.querySelector(".spacingpicker-thumb");
        const box = svg?.querySelector(".spacingpicker-thumb-box");
        expect(box).not.toBeNull();
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
        const picker = createSpacingPicker(defaultOpts());
        picker.show();
        const panel = document.body.querySelector(".spacingpicker-panel");
        expect(panel?.parentElement).toBe(document.body);
        picker.destroy();
    });

    test("Panel_HasFixedPosition", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        picker.show();
        const panel = document.body.querySelector(".spacingpicker-panel") as HTMLElement;
        expect(panel?.style.position).toBe("fixed");
        picker.destroy();
    });

    test("Panel_HasZIndex1050", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        picker.show();
        const panel = document.body.querySelector(".spacingpicker-panel") as HTMLElement;
        expect(panel?.style.zIndex).toBe("1050");
        picker.destroy();
    });
});

// ============================================================================
// setPresets — ADDITIONAL COVERAGE
// ============================================================================

describe("setPresets additional coverage", () =>
{
    test("setPresets_KeepsSelectedIfExists", () =>
    {
        const picker = createSpacingPicker(defaultOpts({ value: "Double" }));
        picker.setPresets([
            { name: "Single", lineHeight: 1.0 },
            { name: "Double", lineHeight: 2.0 },
        ]);
        expect(picker.getValue().name).toBe("Double");
        picker.destroy();
    });

    test("setPresets_UpdatesTriggerLabel", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        picker.setPresets([
            { name: "NewDefault", lineHeight: 1.3 },
        ]);
        const label = container.querySelector(".spacingpicker-trigger-label");
        expect(label?.textContent).toBe("NewDefault");
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
        const picker = createSpacingPicker(defaultOpts());
        picker.show();
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Escape", bubbles: true,
        }));
        const panel = document.body.querySelector(".spacingpicker-panel") as HTMLElement;
        expect(panel?.style.display).toBe("none");
        picker.destroy();
    });

    test("ArrowDown_MoveFocusToNextItem", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        picker.show();
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowDown", bubbles: true,
        }));
        const panel = document.body.querySelector(".spacingpicker-panel");
        const focused = panel?.querySelector(".spacingpicker-item--focused");
        expect(focused).not.toBeNull();
        picker.destroy();
    });

    test("ArrowUp_MoveFocusToPreviousItem", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        picker.show();
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowDown", bubbles: true,
        }));
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowUp", bubbles: true,
        }));
        const panel = document.body.querySelector(".spacingpicker-panel");
        const focused = panel?.querySelector(".spacingpicker-item--focused");
        expect(focused).not.toBeNull();
        picker.destroy();
    });

    test("Enter_WhileOpen_ConfirmsFocusedItem", () =>
    {
        const onChange = vi.fn();
        const picker = createSpacingPicker(defaultOpts({ onChange }));
        picker.show();
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowDown", bubbles: true,
        }));
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Enter", bubbles: true,
        }));
        expect(onChange).toHaveBeenCalled();
        picker.destroy();
    });

    test("ArrowDown_OnTrigger_OpensDropdown", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        const trigger = container.querySelector(".spacingpicker-trigger") as HTMLElement;
        trigger.dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowDown", bubbles: true,
        }));
        const panel = document.body.querySelector(".spacingpicker-panel") as HTMLElement;
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
        const picker = createSpacingPicker(defaultOpts());
        picker.show();
        document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        const panel = document.body.querySelector(".spacingpicker-panel") as HTMLElement;
        expect(panel?.style.display).toBe("none");
        picker.destroy();
    });
});

// ============================================================================
// TOGGLE TRIGGER
// ============================================================================

describe("trigger toggle", () =>
{
    test("TriggerClick_TogglesPanel", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        const trigger = container.querySelector(".spacingpicker-trigger") as HTMLElement;
        trigger.click();
        expect(container.querySelector(".spacingpicker")?.classList
            .contains("spacingpicker--open")).toBe(true);
        trigger.click();
        expect(container.querySelector(".spacingpicker")?.classList
            .contains("spacingpicker--open")).toBe(false);
        picker.destroy();
    });
});
