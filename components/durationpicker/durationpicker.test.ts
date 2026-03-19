/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * Repository: pvk2007/theme
 * File GUID: b4c7e2a1-6d8f-4b3a-9e5c-2f1d7a8b3c06
 * Created: 2026-03-19
 */

/**
 * Tests: DurationPicker
 * Comprehensive Vitest unit tests for the DurationPicker component.
 * Covers: factory, options, patterns, getValue/setValue, toISO,
 * toTotalSeconds, clear, enable/disable, and destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
    DurationPicker,
    createDurationPicker,
} from "./durationpicker";
import type {
    DurationPickerOptions,
    DurationValue,
    DurationUnit,
} from "./durationpicker";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function createContainer(): HTMLDivElement
{
    const el = document.createElement("div");
    el.id = "test-durationpicker-container";
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
// FACTORY — createDurationPicker
// ============================================================================

describe("createDurationPicker", () =>
{
    test("Factory_WithContainerId_ReturnsPicker", () =>
    {
        const picker = createDurationPicker("test-durationpicker-container");
        expect(picker).toBeInstanceOf(DurationPicker);
        picker.destroy();
    });

    test("Factory_WithOptions_AppliesPattern", () =>
    {
        const picker = createDurationPicker("test-durationpicker-container", {
            pattern: "d-h-m",
        });
        const val = picker.getValue();
        expect(val).toHaveProperty("d");
        expect(val).toHaveProperty("h");
        expect(val).toHaveProperty("m");
        picker.destroy();
    });

    test("Factory_MountsElementInContainer", () =>
    {
        const picker = createDurationPicker("test-durationpicker-container");
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
    });
});

// ============================================================================
// CONSTRUCTOR
// ============================================================================

describe("DurationPicker constructor", () =>
{
    test("Constructor_DefaultPattern_UsesHoursMinutes", () =>
    {
        const picker = new DurationPicker("test-durationpicker-container");
        const val = picker.getValue();
        expect(val).toHaveProperty("h");
        expect(val).toHaveProperty("m");
        picker.destroy();
    });

    test("Constructor_WithInitialValue_SetsValues", () =>
    {
        const picker = new DurationPicker("test-durationpicker-container", {
            pattern: "h-m-s",
            value: { h: 2, m: 30, s: 15 },
        });
        const val = picker.getValue();
        expect(val.h).toBe(2);
        expect(val.m).toBe(30);
        expect(val.s).toBe(15);
        picker.destroy();
    });

    test("Constructor_PatternDHM_ReturnsThreeUnits", () =>
    {
        const picker = new DurationPicker("test-durationpicker-container", {
            pattern: "d-h-m",
        });
        const val = picker.getValue();
        expect(Object.keys(val)).toHaveLength(3);
        picker.destroy();
    });
});

// ============================================================================
// OPTIONS
// ============================================================================

describe("DurationPicker options", () =>
{
    test("Options_Disabled_DisablesInput", () =>
    {
        const picker = new DurationPicker("test-durationpicker-container", {
            disabled: true,
        });
        const wrapper = container.querySelector(".durationpicker");
        expect(
            wrapper?.classList.contains("durationpicker-disabled")
        ).toBe(true);
        picker.destroy();
    });

    test("Options_SizeSm_AppliesSizeClass", () =>
    {
        const picker = new DurationPicker("test-durationpicker-container", {
            size: "sm",
        });
        const wrapper = container.querySelector(".durationpicker");
        expect(
            wrapper?.classList.contains("durationpicker-sm")
        ).toBe(true);
        picker.destroy();
    });
});

// ============================================================================
// INPUT RENDERING
// ============================================================================

describe("input rendering", () =>
{
    test("Render_CreatesInputElement", () =>
    {
        const picker = new DurationPicker("test-durationpicker-container");
        const input = container.querySelector("input");
        expect(input).not.toBeNull();
        picker.destroy();
    });

    test("Render_InputHasReadonlyByDefault", () =>
    {
        const picker = new DurationPicker("test-durationpicker-container", {
            readonly: true,
        });
        const input = container.querySelector("input") as HTMLInputElement;
        expect(input?.readOnly).toBe(true);
        picker.destroy();
    });
});

// ============================================================================
// getValue / setValue
// ============================================================================

describe("getValue and setValue", () =>
{
    test("getValue_DefaultsToZero", () =>
    {
        const picker = new DurationPicker("test-durationpicker-container", {
            pattern: "h-m",
        });
        const val = picker.getValue();
        expect(val.h).toBe(0);
        expect(val.m).toBe(0);
        picker.destroy();
    });

    test("setValue_ValidDuration_UpdatesValue", () =>
    {
        const picker = new DurationPicker("test-durationpicker-container", {
            pattern: "h-m-s",
        });
        picker.setValue({ h: 5, m: 45, s: 30 });
        const val = picker.getValue();
        expect(val.h).toBe(5);
        expect(val.m).toBe(45);
        expect(val.s).toBe(30);
        picker.destroy();
    });

    test("setValue_FiresOnChange", () =>
    {
        const onChange = vi.fn();
        const picker = new DurationPicker("test-durationpicker-container", {
            pattern: "h-m",
            onChange,
        });
        picker.setValue({ h: 1, m: 30 });
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ h: 1, m: 30 })
        );
        picker.destroy();
    });

    test("setValue_PartialValue_KeepsOtherUnitsZero", () =>
    {
        const picker = new DurationPicker("test-durationpicker-container", {
            pattern: "h-m-s",
        });
        picker.setValue({ h: 3 });
        const val = picker.getValue();
        expect(val.h).toBe(3);
        expect(val.m).toBe(0);
        expect(val.s).toBe(0);
        picker.destroy();
    });
});

// ============================================================================
// ISO 8601 OUTPUT
// ============================================================================

describe("toISO", () =>
{
    test("toISO_ZeroDuration_ReturnsValidISO", () =>
    {
        const picker = new DurationPicker("test-durationpicker-container", {
            pattern: "h-m-s",
        });
        const iso = picker.toISO();
        expect(iso).toMatch(/^P/);
        picker.destroy();
    });

    test("toISO_WithValues_ReturnsCorrectISO", () =>
    {
        const picker = new DurationPicker("test-durationpicker-container", {
            pattern: "h-m-s",
            value: { h: 2, m: 30, s: 0 },
        });
        const iso = picker.toISO();
        expect(iso).toContain("T");
        expect(iso).toContain("2H");
        expect(iso).toContain("30M");
        picker.destroy();
    });

    test("toISO_DaysOnly_ReturnsDatePart", () =>
    {
        const picker = new DurationPicker("test-durationpicker-container", {
            pattern: "d",
            value: { d: 5 },
        });
        const iso = picker.toISO();
        expect(iso).toContain("5D");
        picker.destroy();
    });
});

// ============================================================================
// toTotalSeconds
// ============================================================================

describe("toTotalSeconds", () =>
{
    test("toTotalSeconds_ZeroDuration_ReturnsZero", () =>
    {
        const picker = new DurationPicker("test-durationpicker-container", {
            pattern: "h-m-s",
        });
        expect(picker.toTotalSeconds()).toBe(0);
        picker.destroy();
    });

    test("toTotalSeconds_OneHour_Returns3600", () =>
    {
        const picker = new DurationPicker("test-durationpicker-container", {
            pattern: "h-m-s",
            value: { h: 1, m: 0, s: 0 },
        });
        expect(picker.toTotalSeconds()).toBe(3600);
        picker.destroy();
    });

    test("toTotalSeconds_MixedUnits_CalculatesCorrectly", () =>
    {
        const picker = new DurationPicker("test-durationpicker-container", {
            pattern: "h-m-s",
            value: { h: 1, m: 30, s: 45 },
        });
        // 1*3600 + 30*60 + 45 = 5445
        expect(picker.toTotalSeconds()).toBe(5445);
        picker.destroy();
    });
});

// ============================================================================
// CLEAR
// ============================================================================

describe("clear", () =>
{
    test("clear_ResetsAllUnitsToZero", () =>
    {
        const picker = new DurationPicker("test-durationpicker-container", {
            pattern: "h-m-s",
            value: { h: 5, m: 30, s: 15 },
        });
        picker.clear();
        const val = picker.getValue();
        expect(val.h).toBe(0);
        expect(val.m).toBe(0);
        expect(val.s).toBe(0);
        picker.destroy();
    });

    test("clear_FiresOnChange", () =>
    {
        const onChange = vi.fn();
        const picker = new DurationPicker("test-durationpicker-container", {
            pattern: "h-m",
            value: { h: 2, m: 15 },
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
        const picker = new DurationPicker("test-durationpicker-container");
        picker.disable();
        const wrapper = container.querySelector(".durationpicker");
        expect(
            wrapper?.classList.contains("durationpicker-disabled")
        ).toBe(true);
        picker.destroy();
    });

    test("enable_RemovesDisabledClass", () =>
    {
        const picker = new DurationPicker("test-durationpicker-container", {
            disabled: true,
        });
        picker.enable();
        const wrapper = container.querySelector(".durationpicker");
        expect(
            wrapper?.classList.contains("durationpicker-disabled")
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
        const picker = createDurationPicker("test-durationpicker-container");
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
        expect(container.querySelector(".durationpicker")).toBeNull();
    });

    test("destroy_CalledTwice_DoesNotThrow", () =>
    {
        const picker = new DurationPicker("test-durationpicker-container");
        picker.destroy();
        expect(() => picker.destroy()).not.toThrow();
    });
});
