/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * Repository: pvk2007/theme
 * File GUID: f8a1b6e5-0c4d-4f7e-dh90-6j5h1e2f7g10
 * Created: 2026-03-19
 */

/**
 * Tests: AnglePicker
 * Comprehensive Vitest unit tests for the AnglePicker component.
 * Covers: factory, options, getValue/setValue, dial rendering,
 * input field, dropdown mode, enable/disable, and destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
    AnglePicker,
    createAnglePicker,
} from "./anglepicker";
import type { AnglePickerOptions } from "./anglepicker";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function createContainer(): HTMLDivElement
{
    const el = document.createElement("div");
    el.id = "test-anglepicker-container";
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
// FACTORY — createAnglePicker
// ============================================================================

describe("createAnglePicker", () =>
{
    test("Factory_WithContainerId_ReturnsPicker", () =>
    {
        const picker = createAnglePicker("test-anglepicker-container");
        expect(picker).toBeInstanceOf(AnglePicker);
        picker.destroy();
    });

    test("Factory_MountsElementInContainer", () =>
    {
        const picker = createAnglePicker("test-anglepicker-container");
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
    });

    test("Factory_WithValue_SetsInitialAngle", () =>
    {
        const picker = createAnglePicker("test-anglepicker-container", {
            value: 90,
        });
        expect(picker.getValue()).toBe(90);
        picker.destroy();
    });

    test("Factory_WithOptions_AppliesMode", () =>
    {
        const picker = createAnglePicker("test-anglepicker-container", {
            mode: "dropdown",
        });
        expect(picker).toBeInstanceOf(AnglePicker);
        picker.destroy();
    });
});

// ============================================================================
// CONSTRUCTOR
// ============================================================================

describe("AnglePicker constructor", () =>
{
    test("Constructor_DefaultValue_IsZero", () =>
    {
        const picker = new AnglePicker("test-anglepicker-container");
        expect(picker.getValue()).toBe(0);
        picker.destroy();
    });

    test("Constructor_WithValue45_SetsAngle", () =>
    {
        const picker = new AnglePicker("test-anglepicker-container", {
            value: 45,
        });
        expect(picker.getValue()).toBe(45);
        picker.destroy();
    });

    test("Constructor_Value360_NormalizesToZero", () =>
    {
        const picker = new AnglePicker("test-anglepicker-container", {
            value: 360,
        });
        expect(picker.getValue()).toBe(0);
        picker.destroy();
    });

    test("Constructor_NegativeValue_NormalizesCorrectly", () =>
    {
        const picker = new AnglePicker("test-anglepicker-container", {
            value: -90,
        });
        expect(picker.getValue()).toBe(270);
        picker.destroy();
    });
});

// ============================================================================
// OPTIONS
// ============================================================================

describe("AnglePicker options", () =>
{
    test("Options_ModeInline_RendersDialDirectly", () =>
    {
        const picker = new AnglePicker("test-anglepicker-container", {
            mode: "inline",
        });
        const el = picker.getElement();
        const svg = el?.querySelector("svg");
        expect(svg).not.toBeNull();
        picker.destroy();
    });

    test("Options_ModeDropdown_RendersTrigger", () =>
    {
        const picker = new AnglePicker("test-anglepicker-container", {
            mode: "dropdown",
        });
        const el = picker.getElement();
        const trigger = el?.querySelector(".anglepicker-trigger");
        expect(trigger).not.toBeNull();
        picker.destroy();
    });

    test("Options_SizeSm_AppliesSmallConfig", () =>
    {
        const picker = new AnglePicker("test-anglepicker-container", {
            size: "sm",
        });
        const el = picker.getElement();
        expect(el).not.toBeNull();
        picker.destroy();
    });

    test("Options_SizeLg_AppliesLargeConfig", () =>
    {
        const picker = new AnglePicker("test-anglepicker-container", {
            size: "lg",
        });
        const el = picker.getElement();
        expect(el).not.toBeNull();
        picker.destroy();
    });

    test("Options_SizeMini_AppliesMiniConfig", () =>
    {
        const picker = new AnglePicker("test-anglepicker-container", {
            size: "mini",
        });
        const el = picker.getElement();
        expect(el).not.toBeNull();
        picker.destroy();
    });

    test("Options_ShowInputFalse_HidesInput", () =>
    {
        const picker = new AnglePicker("test-anglepicker-container", {
            showInput: false,
        });
        const el = picker.getElement();
        const input = el?.querySelector("input");
        expect(input).toBeNull();
        picker.destroy();
    });

    test("Options_ShowPreviewTrue_RendersPreview", () =>
    {
        const picker = new AnglePicker("test-anglepicker-container", {
            showPreview: true,
        });
        const el = picker.getElement();
        const preview = el?.querySelector(".anglepicker-preview");
        expect(preview).not.toBeNull();
        picker.destroy();
    });

    test("Options_Disabled_AppliesDisabledClass", () =>
    {
        const picker = new AnglePicker("test-anglepicker-container", {
            disabled: true,
        });
        const el = picker.getElement();
        expect(
            el?.classList.contains("anglepicker--disabled")
        ).toBe(true);
        picker.destroy();
    });
});

// ============================================================================
// DIAL RENDERING
// ============================================================================

describe("dial rendering", () =>
{
    test("Render_CreatesSvgElement", () =>
    {
        const picker = new AnglePicker("test-anglepicker-container");
        const el = picker.getElement();
        const svg = el?.querySelector("svg");
        expect(svg).not.toBeNull();
        picker.destroy();
    });

    test("Render_SvgHasAriaAttributes", () =>
    {
        const picker = new AnglePicker("test-anglepicker-container", {
            value: 45,
        });
        const el = picker.getElement();
        const svg = el?.querySelector("svg");
        expect(svg?.getAttribute("aria-valuenow")).toBe("45");
        picker.destroy();
    });

    test("Render_ShowTicksTrue_RendersTickMarks", () =>
    {
        const picker = new AnglePicker("test-anglepicker-container", {
            showTicks: true,
        });
        const el = picker.getElement();
        const ticks = el?.querySelectorAll(".anglepicker-tick");
        expect(ticks?.length).toBeGreaterThan(0);
        picker.destroy();
    });
});

// ============================================================================
// getValue / setValue
// ============================================================================

describe("getValue and setValue", () =>
{
    test("getValue_ReturnsCurrentAngle", () =>
    {
        const picker = new AnglePicker("test-anglepicker-container", {
            value: 180,
        });
        expect(picker.getValue()).toBe(180);
        picker.destroy();
    });

    test("setValue_ValidAngle_UpdatesValue", () =>
    {
        const picker = new AnglePicker("test-anglepicker-container");
        picker.setValue(270);
        expect(picker.getValue()).toBe(270);
        picker.destroy();
    });

    test("setValue_Over360_NormalizesAngle", () =>
    {
        const picker = new AnglePicker("test-anglepicker-container");
        picker.setValue(450);
        expect(picker.getValue()).toBe(90);
        picker.destroy();
    });

    test("setValue_Negative_NormalizesAngle", () =>
    {
        const picker = new AnglePicker("test-anglepicker-container");
        picker.setValue(-45);
        expect(picker.getValue()).toBe(315);
        picker.destroy();
    });

    test("setValue_Zero_SetsToZero", () =>
    {
        const picker = new AnglePicker("test-anglepicker-container", {
            value: 90,
        });
        picker.setValue(0);
        expect(picker.getValue()).toBe(0);
        picker.destroy();
    });

    test("setValue_359_SetsTo359", () =>
    {
        const picker = new AnglePicker("test-anglepicker-container");
        picker.setValue(359);
        expect(picker.getValue()).toBe(359);
        picker.destroy();
    });
});

// ============================================================================
// INPUT FIELD
// ============================================================================

describe("input field", () =>
{
    test("Input_DefaultShowsAngle", () =>
    {
        const picker = new AnglePicker("test-anglepicker-container", {
            value: 90,
            showInput: true,
        });
        const el = picker.getElement();
        const input = el?.querySelector("input") as HTMLInputElement;
        expect(input).not.toBeNull();
        // Input should show the angle value with degree symbol
        expect(input?.value).toContain("90");
        picker.destroy();
    });

    test("Input_AfterSetValue_Reflects NewAngle", () =>
    {
        const picker = new AnglePicker("test-anglepicker-container", {
            showInput: true,
        });
        picker.setValue(180);
        const el = picker.getElement();
        const input = el?.querySelector("input") as HTMLInputElement;
        expect(input?.value).toContain("180");
        picker.destroy();
    });
});

// ============================================================================
// DROPDOWN MODE
// ============================================================================

describe("dropdown mode", () =>
{
    test("Open_DropdownMode_ShowsDial", () =>
    {
        const onOpen = vi.fn();
        const picker = new AnglePicker("test-anglepicker-container", {
            mode: "dropdown",
            onOpen,
        });
        picker.open();
        expect(onOpen).toHaveBeenCalled();
        picker.close();
        picker.destroy();
    });

    test("Close_DropdownMode_HidesDial", () =>
    {
        const onClose = vi.fn();
        const picker = new AnglePicker("test-anglepicker-container", {
            mode: "dropdown",
            onClose,
        });
        picker.open();
        picker.close();
        expect(onClose).toHaveBeenCalled();
        picker.destroy();
    });

    test("Open_InlineMode_NoOp", () =>
    {
        const onOpen = vi.fn();
        const picker = new AnglePicker("test-anglepicker-container", {
            mode: "inline",
            onOpen,
        });
        picker.open();
        // Inline mode should not trigger open callback
        expect(onOpen).not.toHaveBeenCalled();
        picker.destroy();
    });
});

// ============================================================================
// ENABLE / DISABLE
// ============================================================================

describe("enable and disable", () =>
{
    test("disable_AddsDisabledClass", () =>
    {
        const picker = new AnglePicker("test-anglepicker-container");
        picker.disable();
        const el = picker.getElement();
        expect(
            el?.classList.contains("anglepicker--disabled")
        ).toBe(true);
        picker.destroy();
    });

    test("enable_RemovesDisabledClass", () =>
    {
        const picker = new AnglePicker("test-anglepicker-container", {
            disabled: true,
        });
        picker.enable();
        const el = picker.getElement();
        expect(
            el?.classList.contains("anglepicker--disabled")
        ).toBe(false);
        picker.destroy();
    });
});

// ============================================================================
// getElement
// ============================================================================

describe("getElement", () =>
{
    test("getElement_AfterCreation_ReturnsHTMLElement", () =>
    {
        const picker = new AnglePicker("test-anglepicker-container");
        expect(picker.getElement()).toBeInstanceOf(HTMLElement);
        picker.destroy();
    });

    test("getElement_AfterDestroy_ReturnsNull", () =>
    {
        const picker = new AnglePicker("test-anglepicker-container");
        picker.destroy();
        expect(picker.getElement()).toBeNull();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("destroy", () =>
{
    test("destroy_RemovesFromDOM", () =>
    {
        const picker = createAnglePicker("test-anglepicker-container");
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
        expect(
            container.querySelector(".anglepicker")
        ).toBeNull();
    });

    test("destroy_CalledTwice_DoesNotThrow", () =>
    {
        const picker = new AnglePicker("test-anglepicker-container");
        picker.destroy();
        expect(() => picker.destroy()).not.toThrow();
    });
});
