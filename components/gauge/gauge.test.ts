/**
 * ⚓ TESTS: Gauge
 * Comprehensive tests for the Gauge component.
 * Tests cover: factory functions, shapes (tile/ring/bar), value mode,
 * threshold colours, setValue/getValue, ARIA, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
    Gauge,
    createGauge,
    createTileGauge,
    createRingGauge,
    createBarGauge,
} from "./gauge";
import type { GaugeOptions, GaugeThreshold } from "./gauge";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function makeContainer(): HTMLDivElement
{
    const el = document.createElement("div");
    el.id = "test-gauge";
    document.body.appendChild(el);
    return el;
}

function defaultOpts(overrides?: Partial<GaugeOptions>): GaugeOptions
{
    return {
        shape: "tile",
        mode: "value",
        value: 50,
        min: 0,
        max: 100,
        title: "Test Gauge",
        ...overrides,
    };
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
// FACTORY — createGauge and convenience functions
// ============================================================================

describe("createGauge", () =>
{
    test("withValidOptions_ReturnsGaugeInstance", () =>
    {
        const gauge = createGauge(defaultOpts(), "test-gauge");
        expect(gauge).toBeDefined();
        expect(gauge).toBeInstanceOf(Gauge);
        gauge.destroy();
    });

    test("withContainerId_MountsIntoContainer", () =>
    {
        const gauge = createGauge(defaultOpts(), "test-gauge");
        expect(container.children.length).toBeGreaterThan(0);
        gauge.destroy();
    });

    test("withInitialValue_SetsValue", () =>
    {
        const gauge = createGauge(defaultOpts({ value: 75 }), "test-gauge");
        expect(gauge.getValue()).toBe(75);
        gauge.destroy();
    });
});

describe("convenience factory functions", () =>
{
    test("createTileGauge_CreatesTileShape", () =>
    {
        const gauge = createTileGauge(
            { value: 50, title: "Tile" }, "test-gauge"
        );
        const root = gauge.getElement();
        expect(root?.classList.contains("gauge-tile")).toBe(true);
        gauge.destroy();
    });

    test("createRingGauge_CreatesRingShape", () =>
    {
        const gauge = createRingGauge(
            { value: 50, title: "Ring" }, "test-gauge"
        );
        const root = gauge.getElement();
        expect(root?.classList.contains("gauge-ring")).toBe(true);
        gauge.destroy();
    });

    test("createBarGauge_CreatesBarShape", () =>
    {
        const gauge = createBarGauge(
            { value: 50, title: "Bar" }, "test-gauge"
        );
        const root = gauge.getElement();
        expect(root?.classList.contains("gauge-bar")).toBe(true);
        gauge.destroy();
    });
});

// ============================================================================
// TILE SHAPE RENDERING
// ============================================================================

describe("tile rendering", () =>
{
    test("tile_RendersValueDisplay", () =>
    {
        const gauge = createTileGauge(
            { value: 42, unit: "GiB", title: "Storage" }, "test-gauge"
        );
        const root = gauge.getElement()!;
        const valueEl = root.querySelector(".gauge-tile-value");
        expect(valueEl).not.toBeNull();
        expect(valueEl?.textContent).toContain("42");
        gauge.destroy();
    });

    test("tile_RendersTitle", () =>
    {
        const gauge = createTileGauge(
            { value: 50, title: "CPU" }, "test-gauge"
        );
        const root = gauge.getElement()!;
        const titleEl = root.querySelector(".gauge-tile-title");
        expect(titleEl).not.toBeNull();
        expect(titleEl?.textContent).toBe("CPU");
        gauge.destroy();
    });

    test("tile_RendersSubtitle", () =>
    {
        const gauge = createTileGauge(
            { value: 50, max: 100, title: "Storage" }, "test-gauge"
        );
        const root = gauge.getElement()!;
        const subtitleEl = root.querySelector(".gauge-tile-subtitle");
        expect(subtitleEl).not.toBeNull();
        expect(subtitleEl?.textContent).toContain("of 100");
        gauge.destroy();
    });
});

// ============================================================================
// RING SHAPE RENDERING
// ============================================================================

describe("ring rendering", () =>
{
    test("ring_RendersSVGElement", () =>
    {
        const gauge = createRingGauge(
            { value: 60, title: "Usage" }, "test-gauge"
        );
        const root = gauge.getElement()!;
        const svg = root.querySelector("svg");
        expect(svg).not.toBeNull();
        gauge.destroy();
    });

    test("ring_RendersFillCircle", () =>
    {
        const gauge = createRingGauge(
            { value: 60, title: "Usage" }, "test-gauge"
        );
        const root = gauge.getElement()!;
        const fillCircle = root.querySelector(".gauge-ring-fill");
        expect(fillCircle).not.toBeNull();
        gauge.destroy();
    });

    test("ring_RendersCenterValue", () =>
    {
        const gauge = createRingGauge(
            { value: 60, title: "Usage" }, "test-gauge"
        );
        const root = gauge.getElement()!;
        const valueEl = root.querySelector(".gauge-ring-value");
        expect(valueEl).not.toBeNull();
        expect(valueEl?.textContent).toContain("60");
        gauge.destroy();
    });
});

// ============================================================================
// BAR SHAPE RENDERING
// ============================================================================

describe("bar rendering", () =>
{
    test("bar_RendersBarFillElement", () =>
    {
        const gauge = createBarGauge(
            { value: 40, title: "Progress" }, "test-gauge"
        );
        const root = gauge.getElement()!;
        const fill = root.querySelector(".gauge-bar-fill");
        expect(fill).not.toBeNull();
        gauge.destroy();
    });

    test("bar_RendersValueDisplay", () =>
    {
        const gauge = createBarGauge(
            { value: 40, title: "Progress" }, "test-gauge"
        );
        const root = gauge.getElement()!;
        const valueEl = root.querySelector(".gauge-bar-value");
        expect(valueEl).not.toBeNull();
        expect(valueEl?.textContent).toContain("40");
        gauge.destroy();
    });
});

// ============================================================================
// SET / GET VALUE
// ============================================================================

describe("setValue and getValue", () =>
{
    test("setValue_UpdatesValue", () =>
    {
        const gauge = createGauge(defaultOpts(), "test-gauge");
        gauge.setValue(80);
        expect(gauge.getValue()).toBe(80);
        gauge.destroy();
    });

    test("setValue_UpdatesPercentage", () =>
    {
        const gauge = createGauge(defaultOpts(), "test-gauge");
        gauge.setValue(75);
        expect(gauge.getPercentage()).toBe(75);
        gauge.destroy();
    });

    test("setValue_FiresOnChangeCallback", () =>
    {
        const onChange = vi.fn();
        const gauge = createGauge(
            defaultOpts({ onChange }), "test-gauge"
        );
        gauge.setValue(60);
        expect(onChange).toHaveBeenCalledWith(gauge);
        gauge.destroy();
    });

    test("getPercentage_ReturnsCorrectPct", () =>
    {
        const gauge = createGauge(
            defaultOpts({ value: 25, min: 0, max: 100 }),
            "test-gauge"
        );
        expect(gauge.getPercentage()).toBe(25);
        gauge.destroy();
    });
});

// ============================================================================
// THRESHOLDS / SEGMENTS
// ============================================================================

describe("thresholds", () =>
{
    test("withCustomThresholds_AppliesColorsBasedOnValue", () =>
    {
        const thresholds: GaugeThreshold[] = [
            { value: 80, color: "#00ff00", label: "Good" },
            { value: 50, color: "#ffff00", label: "Warning" },
            { value: 0,  color: "#ff0000", label: "Critical" },
        ];
        const gauge = createTileGauge(
            { value: 90, thresholds }, "test-gauge"
        );
        // At 90%, first threshold (>=80 Good) should apply
        const root = gauge.getElement()!;
        // jsdom normalizes hex to rgb
        expect(root.style.backgroundColor).toBe("rgb(0, 255, 0)");
        gauge.destroy();
    });

    test("setThresholds_UpdatesColors", () =>
    {
        const gauge = createTileGauge(
            { value: 50 }, "test-gauge"
        );
        gauge.setThresholds([
            { value: 60, color: "#00ff00" },
            { value: 0,  color: "#ff0000" },
        ]);
        // At 50%, should use the threshold for >=0
        const root = gauge.getElement()!;
        expect(root.style.backgroundColor).toBeTruthy();
        gauge.destroy();
    });
});

// ============================================================================
// OVER LIMIT
// ============================================================================

describe("over limit", () =>
{
    test("valueExceedsMax_IsOverLimitTrue", () =>
    {
        const gauge = createGauge(
            defaultOpts({ value: 110 }), "test-gauge"
        );
        expect(gauge.isOverLimit()).toBe(true);
        gauge.destroy();
    });

    test("valueWithinMax_IsOverLimitFalse", () =>
    {
        const gauge = createGauge(
            defaultOpts({ value: 50 }), "test-gauge"
        );
        expect(gauge.isOverLimit()).toBe(false);
        gauge.destroy();
    });

    test("onOverLimit_FiresCallbackWhenExceeded", () =>
    {
        const onOverLimit = vi.fn();
        const gauge = createGauge(
            defaultOpts({ value: 50, onOverLimit }), "test-gauge"
        );
        gauge.setValue(110);
        expect(onOverLimit).toHaveBeenCalledOnce();
        gauge.destroy();
    });
});

// ============================================================================
// SIZE VARIANTS
// ============================================================================

describe("size variants", () =>
{
    test("sizeSmall_AppliesSmClass", () =>
    {
        const gauge = createGauge(
            defaultOpts({ size: "sm" }), "test-gauge"
        );
        const root = gauge.getElement()!;
        expect(root.classList.contains("gauge-sm")).toBe(true);
        gauge.destroy();
    });

    test("sizeLarge_AppliesLgClass", () =>
    {
        const gauge = createGauge(
            defaultOpts({ size: "lg" }), "test-gauge"
        );
        const root = gauge.getElement()!;
        expect(root.classList.contains("gauge-lg")).toBe(true);
        gauge.destroy();
    });

    test("noSize_AppliesFluidClass", () =>
    {
        const gauge = createGauge(defaultOpts(), "test-gauge");
        const root = gauge.getElement()!;
        expect(root.classList.contains("gauge-fluid")).toBe(true);
        gauge.destroy();
    });
});

// ============================================================================
// ARIA / ACCESSIBILITY
// ============================================================================

describe("ARIA attributes", () =>
{
    test("valueModeGauge_HasMeterRole", () =>
    {
        const gauge = createGauge(defaultOpts(), "test-gauge");
        const root = gauge.getElement()!;
        expect(root.getAttribute("role")).toBe("meter");
        gauge.destroy();
    });

    test("gauge_HasAriaValueMin", () =>
    {
        const gauge = createGauge(
            defaultOpts({ min: 10 }), "test-gauge"
        );
        const root = gauge.getElement()!;
        expect(root.getAttribute("aria-valuemin")).toBe("10");
        gauge.destroy();
    });

    test("gauge_HasAriaValueMax", () =>
    {
        const gauge = createGauge(
            defaultOpts({ max: 200 }), "test-gauge"
        );
        const root = gauge.getElement()!;
        expect(root.getAttribute("aria-valuemax")).toBe("200");
        gauge.destroy();
    });

    test("gauge_HasAriaValueNow", () =>
    {
        const gauge = createGauge(
            defaultOpts({ value: 42 }), "test-gauge"
        );
        const root = gauge.getElement()!;
        expect(root.getAttribute("aria-valuenow")).toBe("42");
        gauge.destroy();
    });

    test("gauge_HasAriaLabel", () =>
    {
        const gauge = createGauge(
            defaultOpts({ title: "CPU Usage" }), "test-gauge"
        );
        const root = gauge.getElement()!;
        expect(root.getAttribute("aria-label")).toBeTruthy();
        expect(root.getAttribute("aria-label")).toContain("CPU Usage");
        gauge.destroy();
    });
});

// ============================================================================
// SHOW / HIDE / DESTROY
// ============================================================================

describe("lifecycle", () =>
{
    test("show_MakesGaugeVisible", () =>
    {
        const gauge = new Gauge(defaultOpts());
        gauge.show("test-gauge");
        expect(gauge.isVisible()).toBe(true);
        gauge.destroy();
    });

    test("hide_RemovesFromDOMButPreservesState", () =>
    {
        const gauge = createGauge(defaultOpts(), "test-gauge");
        gauge.hide();
        expect(gauge.isVisible()).toBe(false);
        // Should still retain value
        expect(gauge.getValue()).toBe(50);
        gauge.destroy();
    });

    test("destroy_CleansUpAllReferences", () =>
    {
        const gauge = createGauge(defaultOpts(), "test-gauge");
        gauge.destroy();
        expect(gauge.getElement()).toBeNull();
    });

    test("destroy_CalledTwice_IsIdempotent", () =>
    {
        const gauge = createGauge(defaultOpts(), "test-gauge");
        gauge.destroy();
        expect(() => gauge.destroy()).not.toThrow();
    });

    test("setValueAfterDestroy_DoesNotThrow", () =>
    {
        const gauge = createGauge(defaultOpts(), "test-gauge");
        gauge.destroy();
        expect(() => gauge.setValue(99)).not.toThrow();
    });
});

// ============================================================================
// CUSTOM VALUE FORMATTER
// ============================================================================

describe("custom formatter", () =>
{
    test("formatValue_UsedInDisplay", () =>
    {
        const gauge = createTileGauge({
            value: 50,
            max: 100,
            title: "Formatted",
            formatValue: (v, m, u) => `${v}%`,
        }, "test-gauge");
        const root = gauge.getElement()!;
        const valueEl = root.querySelector(".gauge-tile-value");
        expect(valueEl?.textContent).toBe("50%");
        gauge.destroy();
    });
});
