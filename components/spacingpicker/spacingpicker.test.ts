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
        const panel = container.querySelector(".spacingpicker-panel") as HTMLElement;
        expect(panel?.style.display).toBe("none");
        picker.destroy();
    });

    test("Render_ShowsSixDefaultItems", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        picker.show();
        const items = container.querySelectorAll(".spacingpicker-item");
        expect(items.length).toBe(6);
        picker.destroy();
    });

    test("Render_EachItemHasSvgThumbnail", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        picker.show();
        const svgs = container.querySelectorAll(".spacingpicker-thumb");
        expect(svgs.length).toBe(6);
        picker.destroy();
    });

    test("Render_ShowCustomTrue_RendersCustomLink", () =>
    {
        const picker = createSpacingPicker(defaultOpts({ showCustom: true }));
        picker.show();
        const custom = container.querySelector(".spacingpicker-custom");
        expect(custom).not.toBeNull();
        picker.destroy();
    });

    test("Render_ShowCustomFalse_HidesCustomLink", () =>
    {
        const picker = createSpacingPicker(defaultOpts({ showCustom: false }));
        picker.show();
        const custom = container.querySelector(".spacingpicker-custom");
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
        const panel = container.querySelector(".spacingpicker-panel") as HTMLElement;
        expect(panel?.style.display).not.toBe("none");
        picker.destroy();
    });

    test("hide_ClosesPanel", () =>
    {
        const picker = createSpacingPicker(defaultOpts());
        picker.show();
        picker.hide();
        const panel = container.querySelector(".spacingpicker-panel") as HTMLElement;
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
        const items = container.querySelectorAll(".spacingpicker-item");
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
        const items = container.querySelectorAll(".spacingpicker-item");
        (items[0] as HTMLElement).click();
        const panel = container.querySelector(".spacingpicker-panel") as HTMLElement;
        expect(panel?.style.display).toBe("none");
        picker.destroy();
    });

    test("ClickCustom_FiresOnCustom", () =>
    {
        const onCustom = vi.fn();
        const picker = createSpacingPicker(defaultOpts({ onCustom }));
        picker.show();
        const custom = container.querySelector(".spacingpicker-custom") as HTMLElement;
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
        const items = container.querySelectorAll(".spacingpicker-item");
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
