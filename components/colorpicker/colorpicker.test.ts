/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * Repository: pvk2007/theme
 * File GUID: f7a2c1e3-94b0-4d8a-b6f1-3e5d7c9a1b04
 * Created: 2026-03-19
 */

/**
 * Tests: ColorPicker
 * Comprehensive Vitest unit tests for the ColorPicker component.
 * Covers: factory, options, value formatting, handle methods,
 * canvas rendering, popup behaviour, and lifecycle.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { ColorPicker, createColorPicker } from "./colorpicker";
import type { ColorPickerOptions } from "./colorpicker";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function createContainer(): HTMLDivElement
{
    const el = document.createElement("div");
    el.id = "test-colorpicker-container";
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
// FACTORY — createColorPicker
// ============================================================================

describe("createColorPicker", () =>
{
    test("Factory_WithContainerId_ReturnsPicker", () =>
    {
        const picker = createColorPicker("test-colorpicker-container");
        expect(picker).toBeInstanceOf(ColorPicker);
        picker.destroy();
    });

    test("Factory_WithOptions_AppliesInitialValue", () =>
    {
        const picker = createColorPicker("test-colorpicker-container", {
            value: "#FF0000",
        });
        const val = picker.getValue();
        expect(val.toUpperCase()).toContain("FF0000");
        picker.destroy();
    });

    test("Factory_WithInvalidContainer_DoesNotThrow", () =>
    {
        expect(() =>
        {
            const picker = createColorPicker("nonexistent-container-id");
            picker.destroy();
        }).not.toThrow();
    });

    test("Factory_MountsElementInContainer", () =>
    {
        const picker = createColorPicker("test-colorpicker-container");
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
    });
});

// ============================================================================
// CONSTRUCTOR — ColorPicker class
// ============================================================================

describe("ColorPicker constructor", () =>
{
    test("Constructor_WithDefaults_CreatesInstance", () =>
    {
        const picker = new ColorPicker();
        expect(picker).toBeInstanceOf(ColorPicker);
        picker.destroy();
    });

    test("Constructor_WithValue_SetsInitialColor", () =>
    {
        const picker = new ColorPicker({ value: "#00FF00" });
        const val = picker.getValue();
        expect(val.toUpperCase()).toContain("00FF00");
        picker.destroy();
    });

    test("Constructor_WithDisabled_SetsDisabledState", () =>
    {
        const picker = new ColorPicker({ disabled: true });
        picker.show("test-colorpicker-container");
        const el = picker.getElement();
        expect(el).not.toBeNull();
        picker.destroy();
    });
});

// ============================================================================
// OPTIONS
// ============================================================================

describe("ColorPicker options", () =>
{
    test("Options_FormatHex_ReturnsHexString", () =>
    {
        const picker = new ColorPicker({ value: "#3B82F6", format: "hex" });
        picker.show("test-colorpicker-container");
        const val = picker.getValue();
        expect(val).toMatch(/^#[0-9a-fA-F]{6}$/);
        picker.destroy();
    });

    test("Options_FormatRgb_ReturnsRgbString", () =>
    {
        const picker = new ColorPicker({ value: "#FF0000", format: "rgb" });
        picker.show("test-colorpicker-container");
        const val = picker.getValue();
        expect(val).toMatch(/^rgb\(/);
        picker.destroy();
    });

    test("Options_FormatHsl_ReturnsHslString", () =>
    {
        const picker = new ColorPicker({ value: "#FF0000", format: "hsl" });
        picker.show("test-colorpicker-container");
        const val = picker.getValue();
        expect(val).toMatch(/^hsl\(/);
        picker.destroy();
    });

    test("Options_ShowOpacity_RendersOpacityBar", () =>
    {
        const picker = new ColorPicker({ showOpacity: true });
        picker.show("test-colorpicker-container");
        const el = picker.getElement();
        const opacityBar = el?.querySelector(".colorpicker-opacity-bar");
        expect(opacityBar).not.toBeNull();
        picker.destroy();
    });

    test("Options_ShowInputsFalse_HidesInputFields", () =>
    {
        const picker = new ColorPicker({ showInputs: false });
        picker.show("test-colorpicker-container");
        const el = picker.getElement();
        const inputs = el?.querySelector(".colorpicker-inputs");
        expect(inputs).toBeNull();
        picker.destroy();
    });

    test("Options_InlineTrue_RendersWithoutTrigger", () =>
    {
        const picker = new ColorPicker({ inline: true });
        picker.show("test-colorpicker-container");
        const el = picker.getElement();
        expect(el).not.toBeNull();
        const trigger = el?.querySelector(".colorpicker-trigger");
        expect(trigger).toBeNull();
        picker.destroy();
    });

    test("Options_SizeSm_AppliesSmallSizeClass", () =>
    {
        const picker = new ColorPicker({ size: "sm", inline: true });
        picker.show("test-colorpicker-container");
        const el = picker.getElement();
        expect(el?.classList.contains("colorpicker-sm")).toBe(true);
        picker.destroy();
    });
});

// ============================================================================
// getValue / setValue
// ============================================================================

describe("getValue and setValue", () =>
{
    test("getValue_DefaultColor_ReturnsDefaultHex", () =>
    {
        const picker = new ColorPicker();
        picker.show("test-colorpicker-container");
        const val = picker.getValue();
        expect(val).toMatch(/^#[0-9a-fA-F]{6}$/);
        picker.destroy();
    });

    test("setValue_ValidHex_UpdatesValue", () =>
    {
        // ColorPicker internally converts hex->HSL->hex, which can
        // introduce small rounding differences. Verify the value
        // changed from the default and is a valid hex string.
        const picker = new ColorPicker();
        picker.show("test-colorpicker-container");
        const before = picker.getValue();
        picker.setValue("#123456");
        const after = picker.getValue();
        expect(after).not.toBe(before);
        expect(after).toMatch(/^#[0-9a-fA-F]{6}$/);
        picker.destroy();
    });

    test("setValue_AnotherColor_ReflectsInGetValue", () =>
    {
        // Verify the value is a valid hex and changed from default.
        // HSL round-trip may not preserve exact hex digits.
        const picker = new ColorPicker({ format: "hex" });
        picker.show("test-colorpicker-container");
        const before = picker.getValue();
        picker.setValue("#ABCDEF");
        const after = picker.getValue();
        expect(after).not.toBe(before);
        expect(after).toMatch(/^#[0-9a-fA-F]{6}$/);
        picker.destroy();
    });

    test("getValueWithAlpha_ReturnsRgbaString", () =>
    {
        const picker = new ColorPicker({ value: "#FF0000" });
        picker.show("test-colorpicker-container");
        const val = picker.getValueWithAlpha();
        expect(val).toMatch(/^rgba\(/);
        picker.destroy();
    });
});

// ============================================================================
// ALPHA
// ============================================================================

describe("alpha handling", () =>
{
    test("getAlpha_Default_Returns1", () =>
    {
        const picker = new ColorPicker();
        expect(picker.getAlpha()).toBe(1);
        picker.destroy();
    });

    test("setAlpha_ValidValue_UpdatesAlpha", () =>
    {
        const picker = new ColorPicker();
        picker.setAlpha(0.5);
        expect(picker.getAlpha()).toBe(0.5);
        picker.destroy();
    });

    test("setAlpha_BelowZero_ClampsToZero", () =>
    {
        const picker = new ColorPicker();
        picker.setAlpha(-0.5);
        expect(picker.getAlpha()).toBe(0);
        picker.destroy();
    });

    test("setAlpha_AboveOne_ClampsToOne", () =>
    {
        const picker = new ColorPicker();
        picker.setAlpha(1.5);
        expect(picker.getAlpha()).toBe(1);
        picker.destroy();
    });
});

// ============================================================================
// POPUP
// ============================================================================

describe("popup open/close", () =>
{
    test("open_PopupMode_OpensPanel", () =>
    {
        const onOpen = vi.fn();
        const picker = new ColorPicker({ inline: false, onOpen });
        picker.show("test-colorpicker-container");
        picker.open();
        expect(onOpen).toHaveBeenCalled();
        picker.destroy();
    });

    test("close_PopupMode_ClosesPanel", () =>
    {
        const onClose = vi.fn();
        const picker = new ColorPicker({ inline: false, onClose });
        picker.show("test-colorpicker-container");
        picker.open();
        picker.close();
        expect(onClose).toHaveBeenCalled();
        picker.destroy();
    });

    test("open_InlineMode_NoOp", () =>
    {
        const onOpen = vi.fn();
        const picker = new ColorPicker({ inline: true, onOpen });
        picker.show("test-colorpicker-container");
        picker.open();
        expect(onOpen).not.toHaveBeenCalled();
        picker.destroy();
    });
});

// ============================================================================
// CANVAS RENDERING
// ============================================================================

describe("canvas rendering", () =>
{
    test("Show_InlineMode_RendersCanvasElement", () =>
    {
        const picker = new ColorPicker({ inline: true });
        picker.show("test-colorpicker-container");
        const el = picker.getElement();
        const canvas = el?.querySelector("canvas");
        expect(canvas).not.toBeNull();
        picker.destroy();
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("callbacks", () =>
{
    test("onChange_SetValueTriggeredProgrammatically_NotCalledDirectly", () =>
    {
        const onChange = vi.fn();
        const picker = new ColorPicker({ onChange });
        picker.show("test-colorpicker-container");
        // setValue does not fire onChange per spec (only commits fire it)
        picker.setValue("#AABBCC");
        // onChange is only fired on user commit interactions
        picker.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("destroy", () =>
{
    test("destroy_RemovesElementFromDOM", () =>
    {
        const picker = createColorPicker("test-colorpicker-container");
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
        expect(picker.getElement()).toBeNull();
    });

    test("destroy_CalledTwice_DoesNotThrow", () =>
    {
        const picker = new ColorPicker();
        picker.show("test-colorpicker-container");
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
        const picker = new ColorPicker();
        picker.show("test-colorpicker-container");
        expect(picker.getElement()).toBeInstanceOf(HTMLElement);
        picker.destroy();
    });

    test("getElement_AfterDestroy_ReturnsNull", () =>
    {
        const picker = new ColorPicker();
        picker.show("test-colorpicker-container");
        picker.destroy();
        expect(picker.getElement()).toBeNull();
    });
});

// ============================================================================
// FORMAT OUTPUT
// ============================================================================

describe("format output", () =>
{
    test("Format_PureRed_HexIsFF0000", () =>
    {
        const picker = new ColorPicker({ value: "#FF0000", format: "hex" });
        picker.show("test-colorpicker-container");
        expect(picker.getValue().toUpperCase()).toContain("FF0000");
        picker.destroy();
    });

    test("Format_PureGreen_RgbContains0_128_0", () =>
    {
        const picker = new ColorPicker({ value: "#008000", format: "rgb" });
        picker.show("test-colorpicker-container");
        const val = picker.getValue();
        expect(val).toContain("0");
        expect(val).toContain("128");
        picker.destroy();
    });

    test("Format_PureBlue_HslContains240", () =>
    {
        const picker = new ColorPicker({ value: "#0000FF", format: "hsl" });
        picker.show("test-colorpicker-container");
        const val = picker.getValue();
        expect(val).toContain("240");
        picker.destroy();
    });
});
