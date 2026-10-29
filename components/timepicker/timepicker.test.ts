/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: TimePicker
 * Comprehensive unit tests for the TimePicker spinner component.
 * Tests cover: factory function, class API, options, input rendering,
 * dropdown open/close, spinner columns, increment/decrement,
 * handle methods, ARIA accessibility, and edge cases.
 *
 * Copyright (c) 2026 PVK2007. All rights reserved.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { destroyProbe } from "../../tests/destroy-probe";
import {
    TimePicker,
    createTimePicker,
    TimePickerOptions,
    TimeValue,
} from "./timepicker";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function defaultOpts(
    overrides?: Partial<TimePickerOptions>
): TimePickerOptions
{
    return {
        value: { hours: 14, minutes: 30, seconds: 0 },
        clockMode: "24",
        showSeconds: true,
        showFormatHint: true,
        showNowButton: true,
        ...overrides,
    };
}

function getWrapper(): HTMLElement | null
{
    return container.querySelector(".timepicker");
}

function getInput(): HTMLInputElement | null
{
    return container.querySelector(".timepicker-input");
}

function getDropdown(): HTMLElement | null
{
    return container.querySelector(".timepicker-dropdown");
}

function isDropdownVisible(): boolean
{
    const dd = getDropdown();
    return dd !== null && dd.style.display !== "none";
}

function getToggleButton(): HTMLElement | null
{
    return container.querySelector(".timepicker-toggle");
}

function getSpinners(): HTMLElement[]
{
    return Array.from(
        container.querySelectorAll(".timepicker-spinner")
    );
}

function getSpinnerUpButtons(): HTMLElement[]
{
    return Array.from(
        container.querySelectorAll(".timepicker-spinner-up")
    );
}

function getSpinnerDownButtons(): HTMLElement[]
{
    return Array.from(
        container.querySelectorAll(".timepicker-spinner-down")
    );
}

function getSpinnerValues(): HTMLElement[]
{
    return Array.from(
        container.querySelectorAll(".timepicker-spinner-value")
    );
}

function getNowButton(): HTMLElement | null
{
    return container.querySelector(".timepicker-now-btn");
}

function getFormatHint(): HTMLElement | null
{
    return container.querySelector(".timepicker-hint");
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    vi.useFakeTimers();
    container = document.createElement("div");
    container.id = "test-time-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
});

// ============================================================================
// FACTORY FUNCTION — createTimePicker
// ============================================================================

describe("createTimePicker", () =>
{
    test("factory_WithValidArgs_ReturnsInstance", () =>
    {
        const picker = createTimePicker(
            "test-time-container", defaultOpts()
        );
        expect(picker).toBeDefined();
        expect(picker).toBeInstanceOf(TimePicker);
    });

    test("factory_WithValidArgs_RendersInContainer", () =>
    {
        createTimePicker("test-time-container", defaultOpts());
        expect(getWrapper()).not.toBeNull();
    });

    test("factory_WithNoOptions_UsesDefaults", () =>
    {
        const picker = createTimePicker("test-time-container");
        expect(picker).toBeDefined();
        expect(getWrapper()).not.toBeNull();
    });
});

// ============================================================================
// CONSTRUCTOR
// ============================================================================

describe("TimePicker constructor", () =>
{
    test("constructor_WithMissingContainer_Throws", () =>
    {
        // ERR-1. This case asserted the defect: a container that is
        // not there used to be logged and walked past. AGENTS.md
        // calls that returning a null object.
        expect(() => new TimePicker("nonexistent", defaultOpts())).toThrow(/was not found/);
    });

    test("constructor_WithDisabled_AddsDisabledClass", () =>
    {
        new TimePicker(
            "test-time-container",
            defaultOpts({ disabled: true })
        );
        const wrapper = getWrapper()!;
        expect(wrapper.classList.contains("timepicker-disabled")).toBe(true);
    });
});

// ============================================================================
// INPUT RENDERING
// ============================================================================

describe("input rendering", () =>
{
    test("render_CreatesInput", () =>
    {
        new TimePicker("test-time-container", defaultOpts());
        expect(getInput()).not.toBeNull();
    });

    test("render_InputHasFormatAsPlaceholder", () =>
    {
        new TimePicker(
            "test-time-container",
            defaultOpts({ format: "HH:mm:ss" })
        );
        const input = getInput()!;
        expect(input.getAttribute("placeholder")).toBe("HH:mm:ss");
    });

    test("render_WithValue_PopulatesInput", () =>
    {
        new TimePicker(
            "test-time-container",
            defaultOpts({ value: { hours: 14, minutes: 30, seconds: 0 } })
        );
        const input = getInput()!;
        expect(input.value).toContain("14");
        expect(input.value).toContain("30");
    });

    test("render_WithDisabled_DisablesInput", () =>
    {
        new TimePicker(
            "test-time-container",
            defaultOpts({ disabled: true })
        );
        const input = getInput()!;
        expect(input.disabled).toBe(true);
    });

    test("render_WithReadonly_SetsReadonly", () =>
    {
        new TimePicker(
            "test-time-container",
            defaultOpts({ readonly: true })
        );
        const input = getInput()!;
        expect(input.readOnly).toBe(true);
    });

    test("render_ShowsFormatHint", () =>
    {
        new TimePicker(
            "test-time-container",
            defaultOpts({ showFormatHint: true })
        );
        expect(getFormatHint()).not.toBeNull();
    });

    test("render_HidesFormatHint_WhenFalse", () =>
    {
        new TimePicker(
            "test-time-container",
            defaultOpts({ showFormatHint: false })
        );
        expect(getFormatHint()).toBeNull();
    });

    test("render_HasClockIcon", () =>
    {
        new TimePicker("test-time-container", defaultOpts());
        const icon = container.querySelector(".bi-clock");
        expect(icon).not.toBeNull();
    });
});

// ============================================================================
// DROPDOWN OPEN / CLOSE
// ============================================================================

describe("dropdown open/close", () =>
{
    test("open_Programmatically_ShowsDropdown", () =>
    {
        const picker = new TimePicker(
            "test-time-container", defaultOpts()
        );
        picker.open();
        expect(isDropdownVisible()).toBe(true);
    });

    test("close_Programmatically_HidesDropdown", () =>
    {
        const picker = new TimePicker(
            "test-time-container", defaultOpts()
        );
        picker.open();
        picker.close();
        expect(isDropdownVisible()).toBe(false);
    });

    test("open_WhenDisabled_DoesNotOpen", () =>
    {
        const picker = new TimePicker(
            "test-time-container", defaultOpts({ disabled: true })
        );
        picker.open();
        expect(isDropdownVisible()).toBe(false);
    });

    test("open_OnInputClick_ShowsDropdown", () =>
    {
        new TimePicker("test-time-container", defaultOpts());
        const input = getInput()!;
        input.click();
        expect(isDropdownVisible()).toBe(true);
    });
});

// ============================================================================
// SPINNER COLUMNS
// ============================================================================

describe("spinner columns", () =>
{
    test("open_WithShowSeconds_ShowsThreeSpinners", () =>
    {
        const picker = new TimePicker(
            "test-time-container",
            defaultOpts({ showSeconds: true, clockMode: "24" })
        );
        picker.open();
        const spinners = getSpinners();
        expect(spinners.length).toBeGreaterThanOrEqual(3);
    });

    test("open_WithoutShowSeconds_ShowsTwoSpinners", () =>
    {
        const picker = new TimePicker(
            "test-time-container",
            defaultOpts({ showSeconds: false, clockMode: "24" })
        );
        picker.open();
        const spinners = getSpinners();
        expect(spinners.length).toBeGreaterThanOrEqual(2);
    });

    test("open_12HourMode_ShowsAmPmSpinner", () =>
    {
        const picker = new TimePicker(
            "test-time-container",
            defaultOpts({ clockMode: "12" })
        );
        picker.open();
        // 12-hour mode adds an AM/PM column
        const spinners = getSpinners();
        // At least hours + minutes + AM/PM = 3
        expect(spinners.length).toBeGreaterThanOrEqual(3);
    });
});

// ============================================================================
// SPINNER INCREMENT / DECREMENT
// ============================================================================

describe("spinner increment/decrement", () =>
{
    test("mousedownUp_DecrementsValue (drum convention: up scrolls to prev)", () =>
    {
        const picker = new TimePicker(
            "test-time-container",
            defaultOpts({
                value: { hours: 10, minutes: 30, seconds: 0 },
            })
        );
        picker.open();

        const upBtns = getSpinnerUpButtons();
        if (upBtns.length > 0)
        {
            // Spinners use pointerdown, not click
            upBtns[0].dispatchEvent(
                new PointerEvent("pointerdown", {
                    bubbles: true, cancelable: true,
                })
            );
            const val = picker.getValue();
            expect(val).not.toBeNull();
            expect(val!.hours).toBe(9);
        }
    });

    test("mousedownDown_IncrementsValue (drum convention: down scrolls to next)", () =>
    {
        const picker = new TimePicker(
            "test-time-container",
            defaultOpts({
                value: { hours: 10, minutes: 30, seconds: 0 },
            })
        );
        picker.open();

        const downBtns = getSpinnerDownButtons();
        if (downBtns.length > 0)
        {
            downBtns[0].dispatchEvent(
                new PointerEvent("pointerdown", {
                    bubbles: true, cancelable: true,
                })
            );
            const val = picker.getValue();
            expect(val).not.toBeNull();
            expect(val!.hours).toBe(11);
        }
    });
});

// ============================================================================
// NOW BUTTON
// ============================================================================

describe("now button", () =>
{
    test("showNowButton_True_RendersNowButton", () =>
    {
        const picker = new TimePicker(
            "test-time-container",
            defaultOpts({ showNowButton: true })
        );
        picker.open();
        expect(getNowButton()).not.toBeNull();
    });

    test("showNowButton_False_NoNowButton", () =>
    {
        const picker = new TimePicker(
            "test-time-container",
            defaultOpts({ showNowButton: false })
        );
        picker.open();
        expect(getNowButton()).toBeNull();
    });
});

// ============================================================================
// HANDLE METHODS
// ============================================================================

describe("handle methods", () =>
{
    test("getValue_WithInitialValue_ReturnsTimeValue", () =>
    {
        const picker = new TimePicker(
            "test-time-container",
            defaultOpts({
                value: { hours: 14, minutes: 30, seconds: 15 },
            })
        );
        const val = picker.getValue();
        expect(val).not.toBeNull();
        expect(val!.hours).toBe(14);
        expect(val!.minutes).toBe(30);
        expect(val!.seconds).toBe(15);
    });

    test("getFormattedValue_ReturnsFormattedString", () =>
    {
        const picker = new TimePicker(
            "test-time-container",
            defaultOpts({
                value: { hours: 14, minutes: 30, seconds: 0 },
                format: "HH:mm:ss",
            })
        );
        const formatted = picker.getFormattedValue();
        expect(formatted).toContain("14");
        expect(formatted).toContain("30");
    });

    test("setValue_UpdatesValue", () =>
    {
        const picker = new TimePicker(
            "test-time-container", defaultOpts()
        );
        picker.setValue({ hours: 9, minutes: 15, seconds: 45 });
        const val = picker.getValue();
        expect(val!.hours).toBe(9);
        expect(val!.minutes).toBe(15);
    });

    test("setValue_Null_ClearsValue", () =>
    {
        const picker = new TimePicker(
            "test-time-container", defaultOpts()
        );
        picker.setValue(null);
        expect(picker.getValue()).toBeNull();
    });

    test("setValue_FiresOnChangeCallback", () =>
    {
        const onChange = vi.fn();
        const picker = new TimePicker(
            "test-time-container", defaultOpts({ onChange })
        );
        picker.setValue({ hours: 8, minutes: 0, seconds: 0 });
        expect(onChange).toHaveBeenCalledOnce();
    });

    test("getTimezone_DefaultsToUTC", () =>
    {
        const picker = new TimePicker(
            "test-time-container", defaultOpts()
        );
        expect(picker.getTimezone()).toBe("UTC");
    });

    test("setTimezone_UpdatesTimezone", () =>
    {
        const picker = new TimePicker(
            "test-time-container",
            defaultOpts({ showTimezone: true })
        );
        picker.setTimezone("America/New_York");
        expect(picker.getTimezone()).toBe("America/New_York");
    });

    test("enable_ReEnablesComponent", () =>
    {
        const picker = new TimePicker(
            "test-time-container",
            defaultOpts({ disabled: true })
        );
        picker.enable();
        const input = getInput()!;
        expect(input.disabled).toBe(false);
    });

    test("disable_DisablesComponent", () =>
    {
        const picker = new TimePicker(
            "test-time-container", defaultOpts()
        );
        picker.disable();
        const input = getInput()!;
        expect(input.disabled).toBe(true);
    });

    test("disable_ClosesOpenDropdown", () =>
    {
        const picker = new TimePicker(
            "test-time-container", defaultOpts()
        );
        picker.open();
        picker.disable();
        expect(isDropdownVisible()).toBe(false);
    });

    test("destroy_RemovesFromDom", () =>
    {
        const picker = new TimePicker(
            "test-time-container", defaultOpts()
        );
        picker.destroy();
        expect(getWrapper()).toBeNull();
    });

    test("destroy_CalledTwice_IsIdempotent", () =>
    {
        const picker = new TimePicker(
            "test-time-container", defaultOpts()
        );
        const probe = destroyProbe();

        picker.destroy();
        const first = probe.total();
        picker.destroy();

        expect(first).toBeGreaterThan(0);
        expect(probe.total()).toBe(first);
        probe.restore();
    });
});

// ============================================================================
// ARIA ACCESSIBILITY
// ============================================================================

describe("ARIA attributes", () =>
{
    test("input_HasComboboxRole", () =>
    {
        new TimePicker("test-time-container", defaultOpts());
        const input = getInput()!;
        expect(input.getAttribute("role")).toBe("combobox");
    });

    test("input_HasAriaExpanded_False_WhenClosed", () =>
    {
        new TimePicker("test-time-container", defaultOpts());
        const input = getInput()!;
        expect(input.getAttribute("aria-expanded")).toBe("false");
    });

    test("input_HasAriaLabel", () =>
    {
        new TimePicker("test-time-container", defaultOpts());
        const input = getInput()!;
        expect(input.getAttribute("aria-label")).toBeTruthy();
    });

    test("input_HasAriaHaspopup", () =>
    {
        new TimePicker("test-time-container", defaultOpts());
        const input = getInput()!;
        expect(input.getAttribute("aria-haspopup")).toBe("dialog");
    });

    test("toggleButton_HasAriaLabel", () =>
    {
        new TimePicker("test-time-container", defaultOpts());
        const btn = getToggleButton()!;
        expect(btn.getAttribute("aria-label")).toBeTruthy();
    });
});

// ============================================================================
// SIZE VARIANTS
// ============================================================================

describe("size variants", () =>
{
    test("miniSize_AddsMiniClass", () =>
    {
        new TimePicker(
            "test-time-container", defaultOpts({ size: "mini" })
        );
        const wrapper = getWrapper()!;
        expect(wrapper.classList.contains("timepicker-mini")).toBe(true);
    });

    test("lgSize_AddsLgClass", () =>
    {
        new TimePicker(
            "test-time-container", defaultOpts({ size: "lg" })
        );
        const wrapper = getWrapper()!;
        expect(wrapper.classList.contains("timepicker-lg")).toBe(true);
    });
});

// ============================================================================
// MINUTE STEP
// ============================================================================

describe("minute step", () =>
{
    test("minuteStep5_SnapsToStep", () =>
    {
        const picker = new TimePicker(
            "test-time-container",
            defaultOpts({
                minuteStep: 5,
                value: { hours: 10, minutes: 33, seconds: 0 },
            })
        );
        const val = picker.getValue();
        expect(val).not.toBeNull();
        // Should snap to nearest 5-minute boundary
        expect(val!.minutes % 5).toBe(0);
    });
});

// ============================================================================
// SURFACE CONTRACT (readiness step 2 B2): additive on("timezone"),
// getState/setState and setData. onTimezoneChange keeps firing first, once.
// ============================================================================

describe("surface contract", () =>
{
    test("on(timezone)_HearsTheSelector_AfterOnTimezoneChange", () =>
    {
        const order: string[] = [];
        const picker = createTimePicker("test-time-container", defaultOpts({ showTimezone: true,
            onTimezoneChange: (tz) => order.push(`option:${tz}`) }));
        picker.on("timezone", (tz) => order.push(`channel:${String(tz)}`));

        (container.querySelector(".timepicker-tz-input") as HTMLElement).click();
        const option = document.querySelectorAll(".timepicker-tz-option")[1] as HTMLElement;
        const tz = picker.getTimezone();
        option.dispatchEvent(new Event("pointerdown", { bubbles: true, cancelable: true }));

        expect(picker.getTimezone()).not.toBe(tz);
        expect(order).toEqual([`option:${picker.getTimezone()}`, `channel:${picker.getTimezone()}`]);
        picker.destroy();
    });

    test("on(timezone)_HearsSetTimezone_AfterOnTimezoneChange", () =>
    {
        const order: string[] = [];
        const picker = createTimePicker("test-time-container", defaultOpts({
            onTimezoneChange: (tz) => order.push(`option:${tz}`) }));
        const off = picker.on("timezone", (tz) => order.push(`channel:${String(tz)}`));

        picker.setTimezone("Europe/Paris");
        off();
        picker.setTimezone("Asia/Tokyo");

        expect(order).toEqual(["option:Europe/Paris", "channel:Europe/Paris", "option:Asia/Tokyo"]);
        picker.destroy();
    });

    test("getState_SetState_RoundTripTheTimezone", () =>
    {
        const picker = createTimePicker("test-time-container", defaultOpts({ timezone: "America/New_York" }));
        const captured = picker.getState();

        picker.setTimezone("Asia/Tokyo");
        expect(picker.getState()).toEqual({ timezone: "Asia/Tokyo" });

        picker.setState(captured);
        expect(picker.getState()).toEqual({ timezone: "America/New_York" });
        picker.destroy();
    });

    test("on_UnknownChannel_AndSetData_Throw", () =>
    {
        const picker = createTimePicker("test-time-container", defaultOpts());

        expect(() => picker.on("change", () => undefined)).toThrow("timezone");
        expect(() => picker.setData("value", null)).toThrow("no data slots");
        picker.destroy();
    });
});

// ============================================================================
// TYPED INPUT (found by the A2UI gesture test, readiness step 2 B2): every
// typed time was rejected, because the format's regex quantifiers ({2}) were
// escaped along with its literal characters.
// ============================================================================

describe("typed input", () =>
{
    test.each([
        ["HH:mm:ss", "10:45:15", { hours: 10, minutes: 45, seconds: 15 }],
        ["HH:mm", "07:05", { hours: 7, minutes: 5 }],
        ["H.mm", "7.05", { hours: 7, minutes: 5 }],
    ])("format %s accepts typed %s", (format, typed, expected) =>
    {
        const picker = createTimePicker("test-time-container", defaultOpts({ format, showSeconds: format.includes("ss") }));
        const input = getInput() as HTMLInputElement;

        input.value = typed;
        input.dispatchEvent(new Event("blur"));

        expect(picker.getValue()).toMatchObject(expected);
        picker.destroy();
    });

    test("a 12-hour format reads its hours before its minutes", () =>
    {
        const picker = createTimePicker("test-time-container", defaultOpts({ format: "h:mm A", clockMode: "12",
            showSeconds: false }));
        const input = getInput() as HTMLInputElement;

        input.value = "7:05 PM";
        input.dispatchEvent(new Event("blur"));

        expect(picker.getValue()).toMatchObject({ hours: 19, minutes: 5 });
        picker.destroy();
    });

    test("a malformed time is still rejected and reverted", () =>
    {
        const picker = createTimePicker("test-time-container", defaultOpts());
        const input = getInput() as HTMLInputElement;

        input.value = "10:4x:15";
        input.dispatchEvent(new Event("blur"));

        expect(picker.getValue()).toMatchObject({ hours: 14, minutes: 30 });
        picker.destroy();
    });
});
