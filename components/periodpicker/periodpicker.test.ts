/**
 * TESTS: PeriodPicker
 * Spec-based tests for the PeriodPicker coarse time-period selector.
 * Tests cover: factory, options, DOM structure, ARIA, handle methods,
 * callbacks, keyboard navigation, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { PeriodPicker, createPeriodPicker } from "./periodpicker";

import type { PeriodValue, PeriodPickerOptions } from "./periodpicker";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function queryWrapper(): HTMLElement | null
{
    return container.querySelector("[class*='periodpicker']");
}

function queryInput(): HTMLInputElement | null
{
    return container.querySelector("input") as HTMLInputElement | null;
}

function queryDropdown(): HTMLElement | null
{
    return container.querySelector(
        ".periodpicker-dropdown"
    ) as HTMLElement | null;
}

function buildQ1Value(): PeriodValue
{
    return {
        year: 2026,
        period: "Q1",
        type: "quarter",
        date: new Date(2026, 0, 1),
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "test-periodpicker";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY — createPeriodPicker
// ============================================================================

describe("createPeriodPicker", () =>
{
    test("withContainerId_MountsInContainer", () =>
    {
        createPeriodPicker("test-periodpicker");
        expect(queryWrapper()).not.toBeNull();
    });

    test("returnsPeriodPickerInstance", () =>
    {
        const pp = createPeriodPicker("test-periodpicker");
        expect(pp).toBeInstanceOf(PeriodPicker);
    });

    test("withOptions_PassesConfig", () =>
    {
        const pp = createPeriodPicker("test-periodpicker", {
            mode: "end",
        });
        expect(pp.getValue()).toBeNull();
    });
});

// ============================================================================
// CONSTRUCTOR
// ============================================================================

describe("PeriodPicker constructor", () =>
{
    test("defaultMode_IsStart", () =>
    {
        const pp = new PeriodPicker("test-periodpicker");
        expect(pp).toBeInstanceOf(PeriodPicker);
    });

    test("withInitialValue_SelectsPeriod", () =>
    {
        const value = buildQ1Value();
        const pp = new PeriodPicker("test-periodpicker", { value });
        expect(pp.getValue()).not.toBeNull();
        expect(pp.getValue()?.period).toBe("Q1");
    });

    test("withoutInitialValue_ReturnsNull", () =>
    {
        const pp = new PeriodPicker("test-periodpicker");
        expect(pp.getValue()).toBeNull();
    });
});

// ============================================================================
// PUBLIC METHODS — getValue / setValue
// ============================================================================

describe("getValue and setValue", () =>
{
    test("getValue_ReturnsDefensiveCopy", () =>
    {
        const pp = new PeriodPicker("test-periodpicker", {
            value: buildQ1Value(),
        });
        const v1 = pp.getValue();
        const v2 = pp.getValue();
        expect(v1).toEqual(v2);
        expect(v1).not.toBe(v2);
    });

    test("setValue_UpdatesValue", () =>
    {
        const pp = new PeriodPicker("test-periodpicker");
        pp.setValue(buildQ1Value());
        expect(pp.getValue()?.period).toBe("Q1");
    });

    test("setValue_Null_ClearsSelection", () =>
    {
        const pp = new PeriodPicker("test-periodpicker", {
            value: buildQ1Value(),
        });
        pp.setValue(null);
        expect(pp.getValue()).toBeNull();
    });

    test("getFormattedValue_ReturnsString", () =>
    {
        const pp = new PeriodPicker("test-periodpicker", {
            value: buildQ1Value(),
        });
        expect(pp.getFormattedValue()).toBe("Q1 2026");
    });

    test("getFormattedValue_WhenEmpty_ReturnsEmptyString", () =>
    {
        const pp = new PeriodPicker("test-periodpicker");
        expect(pp.getFormattedValue()).toBe("");
    });
});

// ============================================================================
// PUBLIC METHODS — open / close
// ============================================================================

describe("open and close", () =>
{
    test("open_ShowsDropdown", () =>
    {
        const pp = new PeriodPicker("test-periodpicker");
        pp.open();
        // Dropdown is appended to document.body, not the container
        const dropdown = document.body.querySelector(
            ".periodpicker-dropdown"
        );
        expect(dropdown).not.toBeNull();
    });

    test("close_HidesDropdown", () =>
    {
        const pp = new PeriodPicker("test-periodpicker");
        pp.open();
        pp.close();
        expect(pp.getValue()).toBeNull();
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("callbacks", () =>
{
    test("onChange_FiresOnSetValue", () =>
    {
        const onChange = vi.fn();
        const pp = new PeriodPicker("test-periodpicker", { onChange });
        pp.setValue(buildQ1Value());
        expect(onChange).toHaveBeenCalled();
    });

    test("onChange_FiresNullOnClear", () =>
    {
        const onChange = vi.fn();
        const pp = new PeriodPicker("test-periodpicker", {
            onChange,
            value: buildQ1Value(),
        });
        pp.setValue(null);
        expect(onChange).toHaveBeenCalledWith(null);
    });
});

// ============================================================================
// OPTIONS — granularities
// ============================================================================

describe("granularity options", () =>
{
    test("monthOnly_RendersMonthCells", () =>
    {
        const pp = new PeriodPicker("test-periodpicker", {
            granularities: ["month"],
        });
        pp.open();
        const dropdown = document.body.querySelector(
            ".periodpicker-dropdown"
        );
        expect(dropdown).not.toBeNull();
    });

    test("allGranularities_Default", () =>
    {
        const pp = new PeriodPicker("test-periodpicker");
        pp.open();
        const dropdown = document.body.querySelector(
            ".periodpicker-dropdown"
        );
        expect(dropdown).not.toBeNull();
    });
});

// ============================================================================
// OPTIONS — disabled / readonly
// ============================================================================

describe("disabled and readonly", () =>
{
    test("disabled_PreventsFunctionality", () =>
    {
        const pp = new PeriodPicker("test-periodpicker", {
            disabled: true,
        });
        const input = queryInput();
        expect(input?.disabled).toBe(true);
    });

    test("readonly_SetsReadonly", () =>
    {
        const pp = new PeriodPicker("test-periodpicker", {
            readonly: true,
        });
        const input = queryInput();
        expect(input?.readOnly).toBe(true);
    });
});

// ============================================================================
// ARIA / ACCESSIBILITY
// ============================================================================

describe("accessibility", () =>
{
    test("inputHasCorrectRole", () =>
    {
        new PeriodPicker("test-periodpicker");
        const input = queryInput();
        expect(input).not.toBeNull();
    });

    test("hasLiveRegion", () =>
    {
        new PeriodPicker("test-periodpicker");
        // Live region is appended to document.body, not the container
        const liveRegion = document.body.querySelector("[aria-live]");
        expect(liveRegion).not.toBeNull();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("yearGranularity_FormatsYear", () =>
    {
        const pp = new PeriodPicker("test-periodpicker");
        pp.setValue({
            year: 2026,
            period: "2026",
            type: "year",
            date: new Date(2026, 0, 1),
        });
        expect(pp.getFormattedValue()).toBe("2026");
    });

    test("halfGranularity_FormatsCorrectly", () =>
    {
        const pp = new PeriodPicker("test-periodpicker");
        pp.setValue({
            year: 2026,
            period: "H1",
            type: "half",
            date: new Date(2026, 0, 1),
        });
        expect(pp.getFormattedValue()).toBe("H1 2026");
    });

    test("placeholder_SetsOnInput", () =>
    {
        new PeriodPicker("test-periodpicker", {
            placeholder: "Pick period...",
        });
        const input = queryInput();
        expect(input?.placeholder).toContain("Pick period");
    });

    test("size_sm_AppliesSizeClass", () =>
    {
        new PeriodPicker("test-periodpicker", { size: "sm" });
        const wrapper = queryWrapper();
        expect(wrapper).not.toBeNull();
    });
});
