/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: Slider
 * Comprehensive tests for the Slider component.
 * Tests cover: factory, single/range modes, value API, keyboard navigation,
 * tick marks, ARIA attributes, size variants, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { destroyProbe } from "../../tests/destroy-probe";
import { createSlider } from "./slider";
import type { SliderOptions, SliderHandle } from "./slider";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function makeContainer(): HTMLDivElement
{
    const el = document.createElement("div");
    el.id = "test-slider";
    document.body.appendChild(el);
    return el;
}

function createDefaultSlider(
    overrides?: Partial<SliderOptions>
): SliderHandle
{
    return createSlider("test-slider", {
        min: 0,
        max: 100,
        value: 50,
        ...overrides,
    });
}

function getThumb(el: HTMLElement): HTMLElement | null
{
    return el.querySelector(".slider-thumb") as HTMLElement | null;
}

function getThumbLow(el: HTMLElement): HTMLElement | null
{
    return el.querySelector(".slider-thumb-low") as HTMLElement | null;
}

function getThumbHigh(el: HTMLElement): HTMLElement | null
{
    return el.querySelector(".slider-thumb-high") as HTMLElement | null;
}

function pressKey(
    el: HTMLElement, key: string,
    opts?: Partial<KeyboardEventInit>
): void
{
    el.dispatchEvent(new KeyboardEvent("keydown", {
        key, bubbles: true, cancelable: true, ...opts,
    }));
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = makeContainer();
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY — createSlider
// ============================================================================

describe("createSlider", () =>
{
    test("withValidContainerId_MountsIntoContainer", () =>
    {
        const slider = createDefaultSlider();
        expect(container.children.length).toBeGreaterThan(0);
        slider.destroy();
    });

    test("withValidOptions_ReturnsSliderHandle", () =>
    {
        const slider = createDefaultSlider();
        expect(slider).toBeDefined();
        expect(typeof slider.getValue).toBe("function");
        expect(typeof slider.setValue).toBe("function");
        expect(typeof slider.destroy).toBe("function");
        slider.destroy();
    });

    test("withMissingContainer_Throws", () =>
    {
        // ERR-1. This case asserted the defect: a container that is
        // not there used to be logged and walked past. AGENTS.md
        // calls that returning a null object.
        expect(() =>
        {
            const slider = createSlider("nonexistent", { min: 0, max: 100 });
            slider.destroy();
        }).toThrow(/was not found/);
    });

    test("withDefaultOptions_SetsDefaultValues", () =>
    {
        const slider = createDefaultSlider();
        expect(slider.getValue()).toBe(50);
        slider.destroy();
    });
});

// ============================================================================
// SINGLE THUMB RENDERING
// ============================================================================

describe("single thumb rendering", () =>
{
    test("singleMode_RendersSingleThumb", () =>
    {
        const slider = createDefaultSlider();
        const root = slider.getElement();
        const thumb = getThumb(root);
        expect(thumb).not.toBeNull();
        slider.destroy();
    });

    test("singleMode_ThumbHasSliderRole", () =>
    {
        const slider = createDefaultSlider();
        const root = slider.getElement();
        const thumb = getThumb(root);
        expect(thumb?.getAttribute("role")).toBe("slider");
        slider.destroy();
    });

    test("singleMode_NoRangeThumbs", () =>
    {
        const slider = createDefaultSlider();
        const root = slider.getElement();
        expect(getThumbLow(root)).toBeNull();
        expect(getThumbHigh(root)).toBeNull();
        slider.destroy();
    });

    test("withLabel_RendersLabelText", () =>
    {
        const slider = createDefaultSlider({ label: "Volume" });
        const root = slider.getElement();
        const label = root.querySelector(".slider-label");
        expect(label).not.toBeNull();
        expect(label?.textContent).toBe("Volume");
        slider.destroy();
    });

    test("withShowValueTrue_RendersValueLabel", () =>
    {
        const slider = createDefaultSlider({ showValue: true });
        const root = slider.getElement();
        const valueLabel = root.querySelector(".slider-value-label");
        expect(valueLabel).not.toBeNull();
        expect(valueLabel?.textContent).toBe("50");
        slider.destroy();
    });

    test("withShowValueFalse_OmitsValueLabel", () =>
    {
        const slider = createDefaultSlider({ showValue: false });
        const root = slider.getElement();
        const valueLabel = root.querySelector(".slider-value-label");
        expect(valueLabel).toBeNull();
        slider.destroy();
    });
});

// ============================================================================
// DUAL THUMB (RANGE MODE)
// ============================================================================

describe("range mode", () =>
{
    test("rangeMode_RendersLowAndHighThumbs", () =>
    {
        const slider = createDefaultSlider({
            mode: "range",
            valueLow: 20,
            valueHigh: 80,
        });
        const root = slider.getElement();
        expect(getThumbLow(root)).not.toBeNull();
        expect(getThumbHigh(root)).not.toBeNull();
        slider.destroy();
    });

    test("getRange_ReturnsLowAndHighValues", () =>
    {
        const slider = createDefaultSlider({
            mode: "range",
            valueLow: 20,
            valueHigh: 80,
        });
        const range = slider.getRange();
        expect(range.low).toBe(20);
        expect(range.high).toBe(80);
        slider.destroy();
    });

    test("setRange_UpdatesBothValues", () =>
    {
        const slider = createDefaultSlider({
            mode: "range",
            valueLow: 20,
            valueHigh: 80,
        });
        slider.setRange(30, 70);
        const range = slider.getRange();
        expect(range.low).toBe(30);
        expect(range.high).toBe(70);
        slider.destroy();
    });

    test("setRange_ClampsLowToNotExceedHigh", () =>
    {
        const slider = createDefaultSlider({
            mode: "range",
            valueLow: 20,
            valueHigh: 80,
        });
        slider.setRange(90, 50);
        const range = slider.getRange();
        expect(range.low).toBeLessThanOrEqual(range.high);
        slider.destroy();
    });
});

// ============================================================================
// VALUE UPDATES
// ============================================================================

describe("value updates", () =>
{
    test("setValue_UpdatesCurrentValue", () =>
    {
        const slider = createDefaultSlider();
        slider.setValue(75);
        expect(slider.getValue()).toBe(75);
        slider.destroy();
    });

    test("setValue_ClampsToMin", () =>
    {
        const slider = createDefaultSlider();
        slider.setValue(-10);
        expect(slider.getValue()).toBe(0);
        slider.destroy();
    });

    test("setValue_ClampsToMax", () =>
    {
        const slider = createDefaultSlider();
        slider.setValue(200);
        expect(slider.getValue()).toBe(100);
        slider.destroy();
    });

    test("setValue_SnapsToStep", () =>
    {
        const slider = createDefaultSlider({ step: 10, value: 0 });
        slider.setValue(23);
        expect(slider.getValue()).toBe(20);
        slider.destroy();
    });

    test("setMin_UpdatesMinimumBound", () =>
    {
        const slider = createDefaultSlider({ value: 10 });
        slider.setMin(20);
        expect(slider.getValue()).toBeGreaterThanOrEqual(20);
        slider.destroy();
    });

    test("setMax_UpdatesMaximumBound", () =>
    {
        const slider = createDefaultSlider({ value: 80 });
        slider.setMax(50);
        expect(slider.getValue()).toBeLessThanOrEqual(50);
        slider.destroy();
    });
});

// ============================================================================
// KEYBOARD NAVIGATION
// ============================================================================

describe("keyboard navigation", () =>
{
    test("arrowRight_IncreasesValueByStep", () =>
    {
        const slider = createDefaultSlider({ value: 50, step: 1 });
        const root = slider.getElement();
        const thumb = getThumb(root)!;
        pressKey(thumb, "ArrowRight");
        expect(slider.getValue()).toBe(51);
        slider.destroy();
    });

    test("arrowLeft_DecreasesValueByStep", () =>
    {
        const slider = createDefaultSlider({ value: 50, step: 1 });
        const root = slider.getElement();
        const thumb = getThumb(root)!;
        pressKey(thumb, "ArrowLeft");
        expect(slider.getValue()).toBe(49);
        slider.destroy();
    });

    test("home_JumpsToMinimum", () =>
    {
        const slider = createDefaultSlider({ value: 50 });
        const root = slider.getElement();
        const thumb = getThumb(root)!;
        pressKey(thumb, "Home");
        expect(slider.getValue()).toBe(0);
        slider.destroy();
    });

    test("end_JumpsToMaximum", () =>
    {
        const slider = createDefaultSlider({ value: 50 });
        const root = slider.getElement();
        const thumb = getThumb(root)!;
        pressKey(thumb, "End");
        expect(slider.getValue()).toBe(100);
        slider.destroy();
    });

    test("arrowRight_ClampsAtMax", () =>
    {
        const slider = createDefaultSlider({ value: 100, step: 1 });
        const root = slider.getElement();
        const thumb = getThumb(root)!;
        pressKey(thumb, "ArrowRight");
        expect(slider.getValue()).toBe(100);
        slider.destroy();
    });

    test("arrowLeft_ClampsAtMin", () =>
    {
        const slider = createDefaultSlider({ value: 0, step: 1 });
        const root = slider.getElement();
        const thumb = getThumb(root)!;
        pressKey(thumb, "ArrowLeft");
        expect(slider.getValue()).toBe(0);
        slider.destroy();
    });
});

// ============================================================================
// TICK MARKS
// ============================================================================

describe("tick marks", () =>
{
    test("showTicksTrue_RendersTickElements", () =>
    {
        const slider = createDefaultSlider({
            showTicks: true,
            step: 25,
        });
        const root = slider.getElement();
        const ticks = root.querySelectorAll(".slider-tick");
        // 0, 25, 50, 75, 100 = 5 ticks
        expect(ticks.length).toBe(5);
        slider.destroy();
    });

    test("showTicksFalse_NoTickElements", () =>
    {
        const slider = createDefaultSlider({ showTicks: false });
        const root = slider.getElement();
        const ticks = root.querySelectorAll(".slider-tick");
        expect(ticks.length).toBe(0);
        slider.destroy();
    });
});

// ============================================================================
// ARIA ATTRIBUTES
// ============================================================================

describe("ARIA attributes", () =>
{
    test("thumb_HasSliderRole", () =>
    {
        const slider = createDefaultSlider();
        const root = slider.getElement();
        const thumb = getThumb(root)!;
        expect(thumb.getAttribute("role")).toBe("slider");
        slider.destroy();
    });

    test("thumb_HasAriaValueMin", () =>
    {
        const slider = createDefaultSlider({ min: 10 });
        const root = slider.getElement();
        const thumb = getThumb(root)!;
        expect(thumb.getAttribute("aria-valuemin")).toBe("10");
        slider.destroy();
    });

    test("thumb_HasAriaValueMax", () =>
    {
        const slider = createDefaultSlider({ max: 200 });
        const root = slider.getElement();
        const thumb = getThumb(root)!;
        expect(thumb.getAttribute("aria-valuemax")).toBe("200");
        slider.destroy();
    });

    test("thumb_HasAriaValueNow", () =>
    {
        const slider = createDefaultSlider({ value: 42 });
        const root = slider.getElement();
        const thumb = getThumb(root)!;
        expect(thumb.getAttribute("aria-valuenow")).toBe("42");
        slider.destroy();
    });

    test("setValue_UpdatesAriaValueNow", () =>
    {
        const slider = createDefaultSlider();
        slider.setValue(75);
        const root = slider.getElement();
        const thumb = getThumb(root)!;
        expect(thumb.getAttribute("aria-valuenow")).toBe("75");
        slider.destroy();
    });

    test("thumb_HasAriaOrientation", () =>
    {
        const slider = createDefaultSlider();
        const root = slider.getElement();
        const thumb = getThumb(root)!;
        expect(thumb.getAttribute("aria-orientation")).toBe("horizontal");
        slider.destroy();
    });

    test("withLabel_SetsAriaLabel", () =>
    {
        const slider = createDefaultSlider({ label: "Brightness" });
        const root = slider.getElement();
        const thumb = getThumb(root)!;
        expect(thumb.getAttribute("aria-label")).toBe("Brightness");
        slider.destroy();
    });
});

// ============================================================================
// DISABLE / ENABLE
// ============================================================================

describe("disable and enable", () =>
{
    test("disable_AddsDisabledClass", () =>
    {
        const slider = createDefaultSlider();
        slider.disable();
        const root = slider.getElement();
        expect(root.classList.contains("slider-disabled")).toBe(true);
        slider.destroy();
    });

    test("enable_RemovesDisabledClass", () =>
    {
        const slider = createDefaultSlider({ disabled: true });
        slider.enable();
        const root = slider.getElement();
        expect(root.classList.contains("slider-disabled")).toBe(false);
        slider.destroy();
    });

    test("disabled_ThumbHasNegativeTabIndex", () =>
    {
        const slider = createDefaultSlider({ disabled: true });
        const root = slider.getElement();
        const thumb = getThumb(root)!;
        expect(thumb.getAttribute("tabindex")).toBe("-1");
        slider.destroy();
    });
});

// ============================================================================
// SIZE VARIANTS
// ============================================================================

describe("size variants", () =>
{
    test("sizeSmall_AppliesSmClass", () =>
    {
        const slider = createDefaultSlider({ size: "sm" });
        const root = slider.getElement();
        expect(root.classList.contains("slider-sm")).toBe(true);
        slider.destroy();
    });

    test("sizeLarge_AppliesLgClass", () =>
    {
        const slider = createDefaultSlider({ size: "lg" });
        const root = slider.getElement();
        expect(root.classList.contains("slider-lg")).toBe(true);
        slider.destroy();
    });

    test("sizeDefault_NoSizeClass", () =>
    {
        const slider = createDefaultSlider();
        const root = slider.getElement();
        expect(root.classList.contains("slider-sm")).toBe(false);
        expect(root.classList.contains("slider-lg")).toBe(false);
        slider.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("destroy", () =>
{
    test("destroy_RemovesFromDOM", () =>
    {
        const slider = createDefaultSlider();
        slider.destroy();
        expect(container.querySelector(".slider")).toBeNull();
    });

    test("destroy_CalledTwice_IsIdempotent", () =>
    {
        const slider = createDefaultSlider();
        const probe = destroyProbe();

        slider.destroy();
        const first = probe.total();
        slider.destroy();

        expect(first).toBeGreaterThan(0);
        expect(probe.total()).toBe(first);
        probe.restore();
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("callbacks", () =>
{
    test("onChange_FiresWhenValueChanges", () =>
    {
        const onChange = vi.fn();
        const slider = createDefaultSlider({ onChange, value: 50 });
        const root = slider.getElement();
        const thumb = getThumb(root)!;
        pressKey(thumb, "ArrowRight");
        expect(onChange).toHaveBeenCalledWith(51);
        slider.destroy();
    });

    test("onChange_FiresWithRangeObjectInRangeMode", () =>
    {
        const onChange = vi.fn();
        const slider = createDefaultSlider({
            mode: "range",
            valueLow: 20,
            valueHigh: 80,
            onChange,
        });
        const root = slider.getElement();
        const thumbLow = getThumbLow(root)!;
        pressKey(thumbLow, "ArrowRight");
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ low: expect.any(Number), high: expect.any(Number) })
        );
        slider.destroy();
    });
});

// ============================================================================
// CUSTOM FORMATTER
// ============================================================================

describe("custom formatter", () =>
{
    test("formatValue_UsedInValueLabel", () =>
    {
        const slider = createDefaultSlider({
            value: 50,
            formatValue: (v) => `$${v}`,
        });
        const root = slider.getElement();
        const valueLabel = root.querySelector(".slider-value-label");
        expect(valueLabel?.textContent).toBe("$50");
        slider.destroy();
    });
});

// ============================================================================
// SURFACE CONTRACT (readiness step 2 B3): additive on("change"),
// getState/setState and setData. onChange keeps firing first, exactly once.
// ============================================================================

describe("surface contract", () =>
{
    test("on(change)_HearsTheValue_AfterOnChange", () =>
    {
        const order: string[] = [];
        const slider = createDefaultSlider({ value: 50, onChange: (v) => order.push(`option:${String(v)}`) });
        const off = slider.on("change", (v) => order.push(`channel:${String(v)}`));
        const thumb = getThumb(slider.getElement())!;

        pressKey(thumb, "ArrowRight");
        off();
        pressKey(thumb, "ArrowRight");

        expect(order).toEqual(["option:51", "channel:51", "option:52"]);
        slider.destroy();
    });

    test("on(change)_InRangeMode_HearsLowAndHigh", () =>
    {
        const heard = vi.fn();
        const slider = createDefaultSlider({ mode: "range", valueLow: 20, valueHigh: 80 });
        slider.on("change", heard);

        pressKey(getThumbLow(slider.getElement())!, "ArrowRight");

        expect(heard).toHaveBeenCalledWith({ low: 21, high: 80 });
        slider.destroy();
    });

    test("getState_SetState_RoundTripValueAndRange", () =>
    {
        const slider = createDefaultSlider({ value: 30 });
        const captured = slider.getState();

        slider.setValue(70);
        expect(slider.getState()).toMatchObject({ value: 70 });

        slider.setState(captured);
        expect(slider.getState()).toEqual(captured);
        slider.destroy();
    });

    test("on_UnknownChannel_AndSetData_Throw", () =>
    {
        const slider = createDefaultSlider();

        expect(() => slider.on("slideEnd", () => undefined)).toThrow("change");
        expect(() => slider.setData("value", 1)).toThrow("no data slots");
        slider.destroy();
    });
});
