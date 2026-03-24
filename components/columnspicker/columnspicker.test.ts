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
