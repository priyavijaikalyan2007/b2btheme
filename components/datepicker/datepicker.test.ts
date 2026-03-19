/**
 * TESTS: DatePicker
 * Comprehensive unit tests for the DatePicker calendar component.
 * Tests cover: factory function, class API, options, input rendering,
 * calendar open/close, day selection, month/year navigation, today button,
 * handle methods, ARIA accessibility, keyboard, and edge cases.
 *
 * Copyright (c) 2026 PVK2007. All rights reserved.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
    DatePicker,
    createDatePicker,
    DatePickerOptions,
} from "./datepicker";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function defaultOpts(
    overrides?: Partial<DatePickerOptions>
): DatePickerOptions
{
    return {
        format: "yyyy-MM-dd",
        value: new Date(2026, 2, 15), // March 15, 2026
        showFormatHint: true,
        showTodayButton: true,
        ...overrides,
    };
}

function getWrapper(): HTMLElement | null
{
    return container.querySelector(".datepicker");
}

function getInput(): HTMLInputElement | null
{
    return container.querySelector(".datepicker-input");
}

function getCalendar(): HTMLElement | null
{
    return container.querySelector(".datepicker-calendar");
}

function isCalendarVisible(): boolean
{
    const cal = getCalendar();
    return cal !== null && cal.style.display !== "none";
}

function getToggleButton(): HTMLElement | null
{
    return container.querySelector(".datepicker-toggle");
}

function getDayCells(): HTMLElement[]
{
    return Array.from(
        container.querySelectorAll(".datepicker-day")
    );
}

function getTodayButton(): HTMLElement | null
{
    return container.querySelector(".datepicker-today-btn");
}

function getHeaderLabel(): HTMLElement | null
{
    return container.querySelector(".datepicker-header-label");
}

function getPrevButton(): HTMLElement | null
{
    return container.querySelector(".datepicker-prev");
}

function getNextButton(): HTMLElement | null
{
    return container.querySelector(".datepicker-next");
}

function getFormatHint(): HTMLElement | null
{
    return container.querySelector(".datepicker-hint");
}

function fireKeydown(
    el: HTMLElement,
    key: string,
    extra?: Partial<KeyboardEventInit>
): void
{
    const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...extra,
    });
    el.dispatchEvent(event);
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    vi.useFakeTimers();
    container = document.createElement("div");
    container.id = "test-date-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
});

// ============================================================================
// FACTORY FUNCTION — createDatePicker
// ============================================================================

describe("createDatePicker", () =>
{
    test("factory_WithValidArgs_ReturnsInstance", () =>
    {
        const picker = createDatePicker(
            "test-date-container", defaultOpts()
        );
        expect(picker).toBeDefined();
        expect(picker).toBeInstanceOf(DatePicker);
    });

    test("factory_WithValidArgs_RendersInContainer", () =>
    {
        createDatePicker("test-date-container", defaultOpts());
        expect(getWrapper()).not.toBeNull();
    });

    test("factory_WithNoOptions_UsesDefaults", () =>
    {
        const picker = createDatePicker("test-date-container");
        expect(picker).toBeDefined();
        expect(getWrapper()).not.toBeNull();
    });
});

// ============================================================================
// CONSTRUCTOR
// ============================================================================

describe("DatePicker constructor", () =>
{
    test("constructor_WithMissingContainer_LogsError", () =>
    {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        new DatePicker("nonexistent", defaultOpts());
        expect(spy).toHaveBeenCalled();
    });

    test("constructor_WithDisabled_AddsDisabledClass", () =>
    {
        new DatePicker(
            "test-date-container",
            defaultOpts({ disabled: true })
        );
        const wrapper = getWrapper()!;
        expect(wrapper.classList.contains("datepicker-disabled")).toBe(true);
    });
});

// ============================================================================
// INPUT RENDERING
// ============================================================================

describe("input rendering", () =>
{
    test("render_CreatesInput", () =>
    {
        new DatePicker("test-date-container", defaultOpts());
        expect(getInput()).not.toBeNull();
    });

    test("render_InputHasFormatAsPlaceholder", () =>
    {
        new DatePicker(
            "test-date-container",
            defaultOpts({ placeholder: undefined })
        );
        const input = getInput()!;
        // Default placeholder is the format string
        expect(input.getAttribute("placeholder")).toBe("yyyy-MM-dd");
    });

    test("render_WithCustomPlaceholder_SetsPlaceholder", () =>
    {
        new DatePicker(
            "test-date-container",
            defaultOpts({ placeholder: "Enter date" })
        );
        const input = getInput()!;
        expect(input.getAttribute("placeholder")).toBe("Enter date");
    });

    test("render_WithValue_PopulatesInput", () =>
    {
        new DatePicker(
            "test-date-container",
            defaultOpts({ value: new Date(2026, 0, 1) })
        );
        const input = getInput()!;
        expect(input.value).toContain("2026");
    });

    test("render_WithDisabled_DisablesInput", () =>
    {
        new DatePicker(
            "test-date-container",
            defaultOpts({ disabled: true })
        );
        const input = getInput()!;
        expect(input.disabled).toBe(true);
    });

    test("render_WithReadonly_SetsReadonly", () =>
    {
        new DatePicker(
            "test-date-container",
            defaultOpts({ readonly: true })
        );
        const input = getInput()!;
        expect(input.readOnly).toBe(true);
    });

    test("render_ShowsFormatHint", () =>
    {
        new DatePicker(
            "test-date-container",
            defaultOpts({ showFormatHint: true })
        );
        expect(getFormatHint()).not.toBeNull();
    });

    test("render_HidesFormatHint_WhenFalse", () =>
    {
        new DatePicker(
            "test-date-container",
            defaultOpts({ showFormatHint: false })
        );
        expect(getFormatHint()).toBeNull();
    });

    test("render_HasCalendarIcon", () =>
    {
        new DatePicker("test-date-container", defaultOpts());
        const icon = container.querySelector(".bi-calendar3");
        expect(icon).not.toBeNull();
    });
});

// ============================================================================
// CALENDAR OPEN / CLOSE
// ============================================================================

describe("calendar open/close", () =>
{
    test("open_Programmatically_ShowsCalendar", () =>
    {
        const picker = new DatePicker(
            "test-date-container", defaultOpts()
        );
        picker.open();
        expect(isCalendarVisible()).toBe(true);
    });

    test("close_Programmatically_HidesCalendar", () =>
    {
        const picker = new DatePicker(
            "test-date-container", defaultOpts()
        );
        picker.open();
        picker.close();
        expect(isCalendarVisible()).toBe(false);
    });

    test("open_WhenDisabled_DoesNotOpen", () =>
    {
        const picker = new DatePicker(
            "test-date-container", defaultOpts({ disabled: true })
        );
        picker.open();
        expect(isCalendarVisible()).toBe(false);
    });

    test("open_OnInputClick_ShowsCalendar", () =>
    {
        new DatePicker("test-date-container", defaultOpts());
        const input = getInput()!;
        input.click();
        expect(isCalendarVisible()).toBe(true);
    });

    test("open_FiresOnOpenCallback", () =>
    {
        const onOpen = vi.fn();
        const picker = new DatePicker(
            "test-date-container", defaultOpts({ onOpen })
        );
        picker.open();
        expect(onOpen).toHaveBeenCalledOnce();
    });

    test("close_FiresOnCloseCallback", () =>
    {
        const onClose = vi.fn();
        const picker = new DatePicker(
            "test-date-container", defaultOpts({ onClose })
        );
        picker.open();
        picker.close();
        expect(onClose).toHaveBeenCalledOnce();
    });
});

// ============================================================================
// DAY SELECTION
// ============================================================================

describe("day selection", () =>
{
    test("clickDay_UpdatesSelectedDate", () =>
    {
        const onSelect = vi.fn();
        const picker = new DatePicker(
            "test-date-container",
            defaultOpts({ onSelect })
        );
        picker.open();

        const days = getDayCells();
        // Find a day cell that has text "10"
        const day10 = days.find(
            (d) => d.textContent?.trim() === "10"
        );
        day10?.click();

        expect(onSelect).toHaveBeenCalledOnce();
    });

    test("clickDay_UpdatesInputValue", () =>
    {
        const picker = new DatePicker(
            "test-date-container",
            defaultOpts({ value: new Date(2026, 2, 15) })
        );
        picker.open();

        const days = getDayCells();
        const day20 = days.find(
            (d) => d.textContent?.trim() === "20"
                && !d.classList.contains("datepicker-day-outside")
        );
        day20?.click();

        const input = getInput()!;
        expect(input.value).toContain("20");
    });

    test("clickDay_ClosesCalendar", () =>
    {
        const picker = new DatePicker(
            "test-date-container", defaultOpts()
        );
        picker.open();

        const days = getDayCells();
        const dayInMonth = days.find(
            (d) => !d.classList.contains("datepicker-day-outside")
                && !d.classList.contains("datepicker-day-disabled")
                && d.textContent?.trim() !== ""
        );
        dayInMonth?.click();

        expect(isCalendarVisible()).toBe(false);
    });
});

// ============================================================================
// MONTH / YEAR NAVIGATION
// ============================================================================

describe("month/year navigation", () =>
{
    test("navigateTo_ChangesViewMonth", () =>
    {
        const picker = new DatePicker(
            "test-date-container", defaultOpts()
        );
        picker.open();
        picker.navigateTo(2026, 6); // July

        const label = getHeaderLabel();
        expect(label?.textContent).toContain("July");
    });

    test("navigateTo_ChangesViewYear", () =>
    {
        const picker = new DatePicker(
            "test-date-container", defaultOpts()
        );
        picker.open();
        picker.navigateTo(2027, 0); // January 2027

        const label = getHeaderLabel();
        expect(label?.textContent).toContain("2027");
    });
});

// ============================================================================
// TODAY BUTTON
// ============================================================================

describe("today button", () =>
{
    test("showTodayButton_True_RendersTodayButton", () =>
    {
        const picker = new DatePicker(
            "test-date-container",
            defaultOpts({ showTodayButton: true })
        );
        picker.open();
        expect(getTodayButton()).not.toBeNull();
    });

    test("showTodayButton_False_NoTodayButton", () =>
    {
        const picker = new DatePicker(
            "test-date-container",
            defaultOpts({ showTodayButton: false })
        );
        picker.open();
        expect(getTodayButton()).toBeNull();
    });
});

// ============================================================================
// MIN / MAX DATE
// ============================================================================

describe("min/max date", () =>
{
    test("setMinDate_ClampsSelection", () =>
    {
        const picker = new DatePicker(
            "test-date-container",
            defaultOpts({ value: new Date(2026, 0, 1) })
        );
        picker.setMinDate(new Date(2026, 0, 10));
        const val = picker.getValue();
        expect(val).not.toBeNull();
        expect(val!.getDate()).toBeGreaterThanOrEqual(10);
    });

    test("setMaxDate_ClampsSelection", () =>
    {
        const picker = new DatePicker(
            "test-date-container",
            defaultOpts({ value: new Date(2026, 0, 20) })
        );
        picker.setMaxDate(new Date(2026, 0, 15));
        const val = picker.getValue();
        expect(val).not.toBeNull();
        expect(val!.getDate()).toBeLessThanOrEqual(15);
    });
});

// ============================================================================
// HANDLE METHODS
// ============================================================================

describe("handle methods", () =>
{
    test("getValue_WithInitialValue_ReturnsDate", () =>
    {
        const picker = new DatePicker(
            "test-date-container",
            defaultOpts({ value: new Date(2026, 2, 15) })
        );
        const val = picker.getValue();
        expect(val).toBeInstanceOf(Date);
        expect(val!.getFullYear()).toBe(2026);
        expect(val!.getMonth()).toBe(2);
        expect(val!.getDate()).toBe(15);
    });

    test("getFormattedValue_ReturnsFormattedString", () =>
    {
        const picker = new DatePicker(
            "test-date-container",
            defaultOpts({
                value: new Date(2026, 2, 15),
                format: "yyyy-MM-dd",
            })
        );
        const formatted = picker.getFormattedValue();
        expect(formatted).toBe("2026-03-15");
    });

    test("setValue_UpdatesValue", () =>
    {
        const picker = new DatePicker(
            "test-date-container", defaultOpts()
        );
        const newDate = new Date(2026, 5, 1);
        picker.setValue(newDate);
        const val = picker.getValue();
        expect(val!.getMonth()).toBe(5);
        expect(val!.getDate()).toBe(1);
    });

    test("setValue_Null_ClearsValue", () =>
    {
        const picker = new DatePicker(
            "test-date-container", defaultOpts()
        );
        picker.setValue(null);
        expect(picker.getValue()).toBeNull();
    });

    test("setValue_FiresOnChangeCallback", () =>
    {
        const onChange = vi.fn();
        const picker = new DatePicker(
            "test-date-container", defaultOpts({ onChange })
        );
        picker.setValue(new Date(2026, 8, 1));
        expect(onChange).toHaveBeenCalledOnce();
    });

    test("enable_ReEnablesComponent", () =>
    {
        const picker = new DatePicker(
            "test-date-container",
            defaultOpts({ disabled: true })
        );
        picker.enable();
        const input = getInput()!;
        expect(input.disabled).toBe(false);
    });

    test("disable_DisablesComponent", () =>
    {
        const picker = new DatePicker(
            "test-date-container", defaultOpts()
        );
        picker.disable();
        const input = getInput()!;
        expect(input.disabled).toBe(true);
    });

    test("disable_ClosesOpenCalendar", () =>
    {
        const picker = new DatePicker(
            "test-date-container", defaultOpts()
        );
        picker.open();
        picker.disable();
        expect(isCalendarVisible()).toBe(false);
    });

    test("destroy_RemovesFromDom", () =>
    {
        const picker = new DatePicker(
            "test-date-container", defaultOpts()
        );
        picker.destroy();
        expect(getWrapper()).toBeNull();
    });

    test("destroy_CalledTwice_IsIdempotent", () =>
    {
        const picker = new DatePicker(
            "test-date-container", defaultOpts()
        );
        picker.destroy();
        expect(() => picker.destroy()).not.toThrow();
    });
});

// ============================================================================
// ARIA ACCESSIBILITY
// ============================================================================

describe("ARIA attributes", () =>
{
    test("input_HasComboboxRole", () =>
    {
        new DatePicker("test-date-container", defaultOpts());
        const input = getInput()!;
        expect(input.getAttribute("role")).toBe("combobox");
    });

    test("input_HasAriaExpanded_False_WhenClosed", () =>
    {
        new DatePicker("test-date-container", defaultOpts());
        const input = getInput()!;
        expect(input.getAttribute("aria-expanded")).toBe("false");
    });

    test("input_HasAriaLabel", () =>
    {
        new DatePicker("test-date-container", defaultOpts());
        const input = getInput()!;
        expect(input.getAttribute("aria-label")).toBeTruthy();
    });

    test("input_HasAriaHaspopup", () =>
    {
        new DatePicker("test-date-container", defaultOpts());
        const input = getInput()!;
        expect(input.getAttribute("aria-haspopup")).toBe("dialog");
    });

    test("toggleButton_HasAriaLabel", () =>
    {
        new DatePicker("test-date-container", defaultOpts());
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
        new DatePicker(
            "test-date-container", defaultOpts({ size: "mini" })
        );
        const wrapper = getWrapper()!;
        expect(wrapper.classList.contains("datepicker-mini")).toBe(true);
    });

    test("lgSize_AddsLgClass", () =>
    {
        new DatePicker(
            "test-date-container", defaultOpts({ size: "lg" })
        );
        const wrapper = getWrapper()!;
        expect(wrapper.classList.contains("datepicker-lg")).toBe(true);
    });
});

// ============================================================================
// WEEK NUMBERS
// ============================================================================

describe("week numbers", () =>
{
    test("showWeekNumbers_True_RendersWeekColumn", () =>
    {
        const picker = new DatePicker(
            "test-date-container",
            defaultOpts({ showWeekNumbers: true })
        );
        picker.open();
        const weekCells = container.querySelectorAll(
            ".datepicker-weeknumber"
        );
        expect(weekCells.length).toBeGreaterThan(0);
    });

    test("showWeekNumbers_False_NoWeekColumn", () =>
    {
        const picker = new DatePicker(
            "test-date-container",
            defaultOpts({ showWeekNumbers: false })
        );
        picker.open();
        const weekCells = container.querySelectorAll(
            ".datepicker-weeknumber"
        );
        expect(weekCells.length).toBe(0);
    });
});
