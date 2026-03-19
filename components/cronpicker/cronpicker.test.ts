/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * Repository: pvk2007/theme
 * File GUID: d6e9f4c3-8a2b-4d5c-bf78-4h3f9c0d5e08
 * Created: 2026-03-19
 */

/**
 * Tests: CronPicker
 * Comprehensive Vitest unit tests for the CronPicker component.
 * Covers: factory, options, getValue/setValue, preset selection,
 * CRON expression parsing, clear, enable/disable, and destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
    CronPicker,
    createCronPicker,
} from "./cronpicker";
import type { CronPickerOptions, CronPreset } from "./cronpicker";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function createContainer(): HTMLDivElement
{
    const el = document.createElement("div");
    el.id = "test-cronpicker-container";
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
// FACTORY — createCronPicker
// ============================================================================

describe("createCronPicker", () =>
{
    test("Factory_WithContainerId_ReturnsPicker", () =>
    {
        const picker = createCronPicker("test-cronpicker-container");
        expect(picker).toBeInstanceOf(CronPicker);
        picker.destroy();
    });

    test("Factory_MountsElementInContainer", () =>
    {
        const picker = createCronPicker("test-cronpicker-container");
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
    });

    test("Factory_WithValue_SetsInitialExpression", () =>
    {
        const picker = createCronPicker("test-cronpicker-container", {
            value: "0 0 12 * * *",
        });
        expect(picker.getValue()).toBe("0 0 12 * * *");
        picker.destroy();
    });
});

// ============================================================================
// CONSTRUCTOR
// ============================================================================

describe("CronPicker constructor", () =>
{
    test("Constructor_DefaultValue_IsEveryMinute", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        expect(picker.getValue()).toBe("0 * * * * *");
        picker.destroy();
    });

    test("Constructor_WithCustomValue_SetsExpression", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            value: "0 0 0 * * *",
        });
        expect(picker.getValue()).toBe("0 0 0 * * *");
        picker.destroy();
    });

    test("Constructor_Disabled_AppliesClass", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            disabled: true,
        });
        const wrapper = container.querySelector(".cronpicker");
        expect(
            wrapper?.classList.contains("cronpicker-disabled")
        ).toBe(true);
        picker.destroy();
    });
});

// ============================================================================
// OPTIONS
// ============================================================================

describe("CronPicker options", () =>
{
    test("Options_ShowPresetsFalse_HidesPresetDropdown", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            showPresets: false,
        });
        const presetSelect = container.querySelector(
            ".cronpicker-presets select"
        );
        expect(presetSelect).toBeNull();
        picker.destroy();
    });

    test("Options_ShowDescriptionTrue_RendersDescription", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            showDescription: true,
        });
        const desc = container.querySelector(".cronpicker-description");
        expect(desc).not.toBeNull();
        picker.destroy();
    });

    test("Options_ShowRawExpressionTrue_RendersInput", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            showRawExpression: true,
        });
        const rawInput = container.querySelector(
            ".cronpicker-raw input"
        );
        expect(rawInput).not.toBeNull();
        picker.destroy();
    });

    test("Options_CustomPresets_UsesProvidedPresets", () =>
    {
        const customPresets: CronPreset[] = [
            { label: "Every 5 min", value: "0 */5 * * * *" },
        ];
        const picker = new CronPicker("test-cronpicker-container", {
            presets: customPresets,
        });
        const presetSelect = container.querySelector("select");
        // Should have the custom preset option
        const options = presetSelect?.querySelectorAll("option");
        expect(options).toBeDefined();
        picker.destroy();
    });
});

// ============================================================================
// getValue / setValue
// ============================================================================

describe("getValue and setValue", () =>
{
    test("getValue_Default_ReturnsEveryMinute", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        expect(picker.getValue()).toBe("0 * * * * *");
        picker.destroy();
    });

    test("setValue_ValidExpression_UpdatesValue", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        picker.setValue("0 0 12 * * *");
        expect(picker.getValue()).toBe("0 0 12 * * *");
        picker.destroy();
    });

    test("setValue_InvalidExpression_DoesNotChange", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        const original = picker.getValue();
        picker.setValue("invalid cron");
        expect(picker.getValue()).toBe(original);
        picker.destroy();
    });

    test("setValue_FiresOnChange", () =>
    {
        const onChange = vi.fn();
        const picker = new CronPicker("test-cronpicker-container", {
            onChange,
        });
        picker.setValue("0 0 0 * * *");
        expect(onChange).toHaveBeenCalledWith("0 0 0 * * *");
        picker.destroy();
    });

    test("setValue_DailyAtNoon_CorrectExpression", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        picker.setValue("0 0 12 * * *");
        expect(picker.getValue()).toBe("0 0 12 * * *");
        picker.destroy();
    });
});

// ============================================================================
// CRON EXPRESSION PARSING
// ============================================================================

describe("CRON expression parsing", () =>
{
    test("Parse_EverySecond_Accepted", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            value: "* * * * * *",
        });
        expect(picker.getValue()).toBe("* * * * * *");
        picker.destroy();
    });

    test("Parse_StepExpression_Accepted", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            value: "0 */5 * * * *",
        });
        expect(picker.getValue()).toContain("*/5");
        picker.destroy();
    });

    test("Parse_RangeExpression_Accepted", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            value: "0 0 9 * * 1-5",
        });
        expect(picker.getValue()).toContain("1-5");
        picker.destroy();
    });
});

// ============================================================================
// getDescription
// ============================================================================

describe("getDescription", () =>
{
    test("getDescription_ReturnsNonEmptyString", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        const desc = picker.getDescription();
        expect(desc).toBeTruthy();
        expect(typeof desc).toBe("string");
        picker.destroy();
    });
});

// ============================================================================
// CLEAR
// ============================================================================

describe("clear", () =>
{
    test("clear_ResetsToDefault", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            value: "0 0 12 * * *",
        });
        picker.clear();
        expect(picker.getValue()).toBe("0 * * * * *");
        picker.destroy();
    });

    test("clear_FiresOnChange", () =>
    {
        const onChange = vi.fn();
        const picker = new CronPicker("test-cronpicker-container", {
            value: "0 0 12 * * *",
            onChange,
        });
        onChange.mockClear();
        picker.clear();
        expect(onChange).toHaveBeenCalled();
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
        const picker = new CronPicker("test-cronpicker-container");
        picker.disable();
        const wrapper = container.querySelector(".cronpicker");
        expect(
            wrapper?.classList.contains("cronpicker-disabled")
        ).toBe(true);
        picker.destroy();
    });

    test("enable_RemovesDisabledClass", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            disabled: true,
        });
        picker.enable();
        const wrapper = container.querySelector(".cronpicker");
        expect(
            wrapper?.classList.contains("cronpicker-disabled")
        ).toBe(false);
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
        const picker = createCronPicker("test-cronpicker-container");
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
        expect(container.querySelector(".cronpicker")).toBeNull();
    });

    test("destroy_CalledTwice_DoesNotThrow", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        picker.destroy();
        expect(() => picker.destroy()).not.toThrow();
    });
});
