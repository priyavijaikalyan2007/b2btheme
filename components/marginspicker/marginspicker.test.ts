/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * Repository: pvk2007/theme
 * File GUID: b8c4d0e2-1f5a-6b7c-d9e3-0a2b4c6d8e1f
 * Created: 2026-03-24
 */

/**
 * Tests: MarginsPicker
 * Comprehensive Vitest unit tests for the MarginsPicker component.
 * Covers: factory, default presets, getValue, setValue, onChange,
 * custom presets, showCustom link, show/hide, and destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
    MarginsPicker,
    createMarginsPicker,
} from "./marginspicker";
import type { MarginPreset, MarginsPickerOptions } from "./marginspicker";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function createContainer(): HTMLDivElement
{
    const el = document.createElement("div");
    el.id = "test-marginspicker-container";
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

function makeOpts(
    overrides?: Partial<MarginsPickerOptions>
): MarginsPickerOptions
{
    return {
        container: "test-marginspicker-container",
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
// FACTORY — createMarginsPicker
// ============================================================================

describe("createMarginsPicker", () =>
{
    test("Factory_WithContainerId_ReturnsPicker", () =>
    {
        const picker = createMarginsPicker(makeOpts());
        expect(picker).toBeDefined();
        expect(picker.getElement()).toBeInstanceOf(HTMLElement);
        picker.destroy();
    });

    test("Factory_MountsElementInContainer", () =>
    {
        const picker = createMarginsPicker(makeOpts());
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
    });

    test("Factory_WithHTMLElement_MountsCorrectly", () =>
    {
        const picker = createMarginsPicker({ container });
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
    });
});

// ============================================================================
// DEFAULT PRESETS
// ============================================================================

describe("default presets", () =>
{
    test("Defaults_RendersAllSixPresets", () =>
    {
        const picker = createMarginsPicker(makeOpts());
        picker.show();
        const items = document.body.querySelectorAll(".marginspicker-item");
        expect(items.length).toBe(6);
        picker.destroy();
    });

    test("Defaults_FirstPresetIsNormal", () =>
    {
        const picker = createMarginsPicker(makeOpts());
        picker.show();
        const first = document.body.querySelector(".marginspicker-item");
        expect(first?.getAttribute("data-preset")).toBe("Normal");
        picker.destroy();
    });

    test("Defaults_PresetsIncludeNarrow", () =>
    {
        const picker = createMarginsPicker(makeOpts());
        picker.show();
        const narrow = document.body.querySelector('[data-preset="Narrow"]');
        expect(narrow).not.toBeNull();
        picker.destroy();
    });

    test("Defaults_PresetsIncludeMirrored", () =>
    {
        const picker = createMarginsPicker(makeOpts());
        picker.show();
        const mirrored = document.body.querySelector('[data-preset="Mirrored"]');
        expect(mirrored).not.toBeNull();
        picker.destroy();
    });

    test("Defaults_EachItemHasSvgThumbnail", () =>
    {
        const picker = createMarginsPicker(makeOpts());
        picker.show();
        const svgs = document.body.querySelectorAll(".marginspicker-thumb");
        expect(svgs.length).toBe(6);
        picker.destroy();
    });
});

// ============================================================================
// getValue
// ============================================================================

describe("getValue", () =>
{
    test("getValue_Default_ReturnsNormalPreset", () =>
    {
        const picker = createMarginsPicker(makeOpts());
        const val = picker.getValue();
        expect(val.name).toBe("Normal");
        expect(val.top).toBe(1);
        expect(val.left).toBe(1);
        picker.destroy();
    });

    test("getValue_WithInitialValue_ReturnsCorrectPreset", () =>
    {
        const picker = createMarginsPicker(makeOpts({ value: "Narrow" }));
        const val = picker.getValue();
        expect(val.name).toBe("Narrow");
        expect(val.top).toBe(0.5);
        picker.destroy();
    });

    test("getValue_MirroredPreset_HasInsideOutside", () =>
    {
        const picker = createMarginsPicker(makeOpts({ value: "Mirrored" }));
        const val = picker.getValue();
        expect(val.inside).toBe(1.25);
        expect(val.outside).toBe(1);
        picker.destroy();
    });
});

// ============================================================================
// setValue
// ============================================================================

describe("setValue", () =>
{
    test("setValue_ValidName_UpdatesSelection", () =>
    {
        const picker = createMarginsPicker(makeOpts());
        picker.setValue("Wide");
        expect(picker.getValue().name).toBe("Wide");
        picker.destroy();
    });

    test("setValue_UpdatesSelectedClass", () =>
    {
        const picker = createMarginsPicker(makeOpts());
        picker.show();
        picker.setValue("Narrow");
        const selected = document.body.querySelector(".marginspicker-item--selected");
        expect(selected?.getAttribute("data-preset")).toBe("Narrow");
        picker.destroy();
    });

    test("setValue_InvalidName_KeepsPrevious", () =>
    {
        const picker = createMarginsPicker(makeOpts());
        picker.setValue("NonExistent");
        expect(picker.getValue().name).toBe("Normal");
        picker.destroy();
    });

    test("setValue_UpdatesTriggerLabel", () =>
    {
        const picker = createMarginsPicker(makeOpts());
        picker.setValue("Wide");
        const el = picker.getElement();
        const label = el.querySelector(".marginspicker-trigger-label");
        expect(label?.textContent).toBe("Wide");
        picker.destroy();
    });
});

// ============================================================================
// onChange
// ============================================================================

describe("onChange", () =>
{
    test("onChange_ItemClick_FiresCallback", () =>
    {
        const onChange = vi.fn();
        const picker = createMarginsPicker(makeOpts({ onChange }));
        picker.show();
        const narrow = document.body.querySelector('[data-preset="Narrow"]') as HTMLElement;
        narrow?.click();
        expect(onChange).toHaveBeenCalledOnce();
        expect(onChange.mock.calls[0][0].name).toBe("Narrow");
        picker.destroy();
    });

    test("onChange_ReceivesFullPresetObject", () =>
    {
        const onChange = vi.fn();
        const picker = createMarginsPicker(makeOpts({ onChange }));
        picker.show();
        const wide = document.body.querySelector('[data-preset="Wide"]') as HTMLElement;
        wide?.click();
        const received = onChange.mock.calls[0][0] as MarginPreset;
        expect(received.top).toBe(1);
        expect(received.left).toBe(2);
        picker.destroy();
    });
});

// ============================================================================
// CUSTOM PRESETS
// ============================================================================

describe("custom presets", () =>
{
    test("CustomPresets_OverrideDefaults", () =>
    {
        const custom: MarginPreset[] = [
            { name: "A4", top: 1.5, bottom: 1.5, left: 1, right: 1 },
            { name: "Legal", top: 1, bottom: 1, left: 0.5, right: 0.5 },
        ];
        const picker = createMarginsPicker(makeOpts({ presets: custom }));
        picker.show();
        const items = document.body.querySelectorAll(".marginspicker-item");
        expect(items.length).toBe(2);
        picker.destroy();
    });

    test("CustomPresets_DefaultValueFallsToFirst", () =>
    {
        const custom: MarginPreset[] = [
            { name: "A4", top: 1.5, bottom: 1.5, left: 1, right: 1 },
        ];
        const picker = createMarginsPicker(makeOpts({
            presets: custom,
            value: "NonExistent",
        }));
        // getValue falls back to first preset
        expect(picker.getValue().name).toBe("A4");
        picker.destroy();
    });

    test("setPresets_ReplacesAndRebuilds", () =>
    {
        const picker = createMarginsPicker(makeOpts());
        const newPresets: MarginPreset[] = [
            { name: "Tight", top: 0.25, bottom: 0.25, left: 0.25, right: 0.25 },
        ];
        picker.setPresets(newPresets);
        picker.show();
        const items = document.body.querySelectorAll(".marginspicker-item");
        expect(items.length).toBe(1);
        expect(picker.getValue().name).toBe("Tight");
        picker.destroy();
    });
});

// ============================================================================
// SHOW CUSTOM LINK
// ============================================================================

describe("showCustom link", () =>
{
    test("ShowCustomTrue_RendersLink", () =>
    {
        const picker = createMarginsPicker(makeOpts({ showCustom: true }));
        picker.show();
        const link = document.body.querySelector(".marginspicker-custom");
        expect(link).not.toBeNull();
        picker.destroy();
    });

    test("ShowCustomFalse_HidesLink", () =>
    {
        const picker = createMarginsPicker(makeOpts({ showCustom: false }));
        picker.show();
        const link = document.body.querySelector(".marginspicker-custom");
        expect(link).toBeNull();
        picker.destroy();
    });

    test("CustomLink_Click_FiresOnCustom", () =>
    {
        const onCustom = vi.fn();
        const picker = createMarginsPicker(makeOpts({ onCustom }));
        picker.show();
        const link = document.body.querySelector(".marginspicker-custom") as HTMLElement;
        link?.click();
        expect(onCustom).toHaveBeenCalledOnce();
        picker.destroy();
    });
});

// ============================================================================
// SHOW / HIDE
// ============================================================================

describe("show and hide", () =>
{
    test("show_OpensPanel", () =>
    {
        const picker = createMarginsPicker(makeOpts());
        picker.show();
        const el = picker.getElement();
        expect(el.classList.contains("marginspicker--open")).toBe(true);
        picker.hide();
        picker.destroy();
    });

    test("hide_ClosesPanel", () =>
    {
        const picker = createMarginsPicker(makeOpts());
        picker.show();
        picker.hide();
        const el = picker.getElement();
        expect(el.classList.contains("marginspicker--open")).toBe(false);
        picker.destroy();
    });

    test("TriggerClick_TogglesPanel", () =>
    {
        const picker = createMarginsPicker(makeOpts());
        const el = picker.getElement();
        const trigger = el.querySelector(".marginspicker-trigger") as HTMLElement;
        trigger.click();
        expect(el.classList.contains("marginspicker--open")).toBe(true);
        trigger.click();
        expect(el.classList.contains("marginspicker--open")).toBe(false);
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
        const picker = createMarginsPicker(makeOpts());
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
        expect(container.querySelector(".marginspicker")).toBeNull();
    });

    test("destroy_CalledTwice_DoesNotThrow", () =>
    {
        const picker = createMarginsPicker(makeOpts());
        picker.destroy();
        expect(() => picker.destroy()).not.toThrow();
    });

    test("destroy_GetElementReturnsNull", () =>
    {
        const picker = createMarginsPicker(makeOpts());
        picker.destroy();
        expect(picker.getElement()).toBeNull();
    });
});
