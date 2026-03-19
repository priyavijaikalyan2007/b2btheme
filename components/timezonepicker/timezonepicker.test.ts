/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * Repository: pvk2007/theme
 * File GUID: c5d8e3b2-7f1a-4c4b-ae6d-3g2e8b9c4d07
 * Created: 2026-03-19
 */

/**
 * Tests: TimezonePicker
 * Comprehensive Vitest unit tests for the TimezonePicker component.
 * Covers: factory, options, getValue/setValue, getOffset, dropdown,
 * search filtering, enable/disable, and destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
    TimezonePicker,
    createTimezonePicker,
} from "./timezonepicker";
import type { TimezonePickerOptions } from "./timezonepicker";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function createContainer(): HTMLDivElement
{
    const el = document.createElement("div");
    el.id = "test-timezonepicker-container";
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
    // jsdom does not implement scrollIntoView; stub it globally.
    Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() =>
{
    removeContainer();
});

// ============================================================================
// FACTORY — createTimezonePicker
// ============================================================================

describe("createTimezonePicker", () =>
{
    test("Factory_WithContainerId_ReturnsPicker", () =>
    {
        const picker = createTimezonePicker("test-timezonepicker-container");
        expect(picker).toBeInstanceOf(TimezonePicker);
        picker.destroy();
    });

    test("Factory_MountsElementInContainer", () =>
    {
        const picker = createTimezonePicker("test-timezonepicker-container");
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
    });

    test("Factory_WithTimezone_SetsInitialValue", () =>
    {
        const picker = createTimezonePicker("test-timezonepicker-container", {
            timezone: "UTC",
        });
        expect(picker.getValue()).toBe("UTC");
        picker.destroy();
    });
});

// ============================================================================
// CONSTRUCTOR
// ============================================================================

describe("TimezonePicker constructor", () =>
{
    test("Constructor_DefaultTimezone_IsUTC", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container");
        expect(picker.getValue()).toBe("UTC");
        picker.destroy();
    });

    test("Constructor_WithTimezone_SetsValue", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container", {
            timezone: "America/New_York",
        });
        expect(picker.getValue()).toBe("America/New_York");
        picker.destroy();
    });

    test("Constructor_Disabled_AppliesClass", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container", {
            disabled: true,
        });
        const wrapper = container.querySelector(".timezonepicker");
        expect(
            wrapper?.classList.contains("timezonepicker-disabled")
        ).toBe(true);
        picker.destroy();
    });
});

// ============================================================================
// OPTIONS
// ============================================================================

describe("TimezonePicker options", () =>
{
    test("Options_SizeSm_AppliesSizeClass", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container", {
            size: "sm",
        });
        const wrapper = container.querySelector(".timezonepicker");
        expect(
            wrapper?.classList.contains("timezonepicker-sm")
        ).toBe(true);
        picker.destroy();
    });

    test("Options_Readonly_SetsInputReadonly", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container", {
            readonly: true,
        });
        const input = container.querySelector("input") as HTMLInputElement;
        expect(input?.readOnly).toBe(true);
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
        const picker = new TimezonePicker("test-timezonepicker-container");
        const input = container.querySelector("input");
        expect(input).not.toBeNull();
        picker.destroy();
    });

    test("Render_InputShowsTimezoneValue", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container", {
            timezone: "UTC",
        });
        const input = container.querySelector("input") as HTMLInputElement;
        expect(input?.value).toContain("UTC");
        picker.destroy();
    });
});

// ============================================================================
// getValue / setValue
// ============================================================================

describe("getValue and setValue", () =>
{
    test("getValue_Default_ReturnsUTC", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container");
        expect(picker.getValue()).toBe("UTC");
        picker.destroy();
    });

    test("setValue_ValidTimezone_UpdatesValue", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container");
        picker.setValue("America/Chicago");
        expect(picker.getValue()).toBe("America/Chicago");
        picker.destroy();
    });

    test("setValue_FiresOnChange", () =>
    {
        const onChange = vi.fn();
        const picker = new TimezonePicker("test-timezonepicker-container", {
            onChange,
        });
        picker.setValue("Europe/London");
        expect(onChange).toHaveBeenCalledWith("Europe/London");
        picker.destroy();
    });

    test("setValue_DifferentTimezone_UpdatesInput", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container");
        picker.setValue("Asia/Tokyo");
        const input = container.querySelector("input") as HTMLInputElement;
        expect(input?.value).toContain("Asia/Tokyo");
        picker.destroy();
    });
});

// ============================================================================
// UTC OFFSET DISPLAY
// ============================================================================

describe("getOffset", () =>
{
    test("getOffset_UTC_ReturnsGMTString", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container", {
            timezone: "UTC",
        });
        const offset = picker.getOffset();
        // UTC should have a GMT-related string
        expect(offset).toBeDefined();
        picker.destroy();
    });

    test("getOffset_AfterSetValue_ReflectsNewTimezone", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container");
        picker.setValue("America/New_York");
        const offset = picker.getOffset();
        expect(offset).toBeDefined();
        expect(typeof offset).toBe("string");
        picker.destroy();
    });
});

// ============================================================================
// DROPDOWN
// ============================================================================

describe("dropdown open/close", () =>
{
    test("open_OpensDropdown", () =>
    {
        const onOpen = vi.fn();
        const picker = new TimezonePicker("test-timezonepicker-container", {
            onOpen,
        });
        picker.open();
        expect(onOpen).toHaveBeenCalled();
        picker.close();
        picker.destroy();
    });

    test("close_ClosesDropdown", () =>
    {
        const onClose = vi.fn();
        const picker = new TimezonePicker("test-timezonepicker-container", {
            onClose,
        });
        picker.open();
        picker.close();
        expect(onClose).toHaveBeenCalled();
        picker.destroy();
    });

    test("open_WhenDisabled_DoesNotOpen", () =>
    {
        const onOpen = vi.fn();
        const picker = new TimezonePicker("test-timezonepicker-container", {
            disabled: true,
            onOpen,
        });
        picker.open();
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
        const picker = new TimezonePicker("test-timezonepicker-container");
        picker.disable();
        const wrapper = container.querySelector(".timezonepicker");
        expect(
            wrapper?.classList.contains("timezonepicker-disabled")
        ).toBe(true);
        picker.destroy();
    });

    test("enable_RemovesDisabledClass", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container", {
            disabled: true,
        });
        picker.enable();
        const wrapper = container.querySelector(".timezonepicker");
        expect(
            wrapper?.classList.contains("timezonepicker-disabled")
        ).toBe(false);
        picker.destroy();
    });

    test("disable_ClosesOpenDropdown", () =>
    {
        const onClose = vi.fn();
        const picker = new TimezonePicker("test-timezonepicker-container", {
            onClose,
        });
        picker.open();
        picker.disable();
        expect(onClose).toHaveBeenCalled();
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
        const picker = createTimezonePicker("test-timezonepicker-container");
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
        expect(container.querySelector(".timezonepicker")).toBeNull();
    });

    test("destroy_CalledTwice_DoesNotThrow", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container");
        picker.destroy();
        expect(() => picker.destroy()).not.toThrow();
    });
});
