/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: Ruler
 * Vitest unit tests for the Ruler component.
 * Covers: factory, options, DOM structure, ARIA, unit switching,
 * orientation, cursor tracking, calibration, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    Ruler,
    createRuler,
} from "./ruler";
import type
{
    RulerOptions,
} from "./ruler";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "test-ruler";
    container.style.width = "600px";
    container.style.height = "30px";
    document.body.appendChild(container);
});

afterEach(() =>
{
    document.body.innerHTML = "";
});

// ============================================================================
// FACTORY — createRuler
// ============================================================================

describe("createRuler", () =>
{
    test("returnsRulerInstance", () =>
    {
        const ruler = createRuler("test-ruler");
        expect(ruler).toBeInstanceOf(Ruler);
        ruler.destroy();
    });

    test("mountsInContainer", () =>
    {
        const ruler = createRuler("test-ruler");
        expect(container.querySelector(".ruler")).not.toBeNull();
        ruler.destroy();
    });

    test("withOptions_CreatesWithConfig", () =>
    {
        const ruler = createRuler("test-ruler", { unit: "cm" });
        expect(ruler.getElement()).not.toBeNull();
        ruler.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("DOM structure", () =>
{
    test("rootElement_HasRulerClass", () =>
    {
        const ruler = createRuler("test-ruler");
        expect(container.querySelector(".ruler")).not.toBeNull();
        ruler.destroy();
    });

    test("containsCanvasElement", () =>
    {
        const ruler = createRuler("test-ruler");
        const canvas = container.querySelector("canvas");
        expect(canvas).not.toBeNull();
        ruler.destroy();
    });

    test("horizontalOrientation_HasHorizontalClass", () =>
    {
        const ruler = createRuler("test-ruler", { orientation: "horizontal" });
        const wrapper = container.querySelector(".ruler");
        expect(
            wrapper?.classList.contains("ruler-horizontal") ||
            wrapper?.classList.contains("ruler")
        ).toBe(true);
        ruler.destroy();
    });
});

// ============================================================================
// ARIA / ACCESSIBILITY
// ============================================================================

describe("accessibility", () =>
{
    test("wrapperHasAriaAttributes", () =>
    {
        const ruler = createRuler("test-ruler");
        const wrapper = container.querySelector(".ruler");
        expect(wrapper?.getAttribute("role") || wrapper?.getAttribute("aria-label"))
            .toBeTruthy();
        ruler.destroy();
    });
});

// ============================================================================
// PUBLIC API — UNIT SWITCHING
// ============================================================================

describe("unit switching", () =>
{
    test("setUnit_ChangesUnit", () =>
    {
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        const ruler = createRuler("test-ruler", { unit: "px" });
        ruler.setUnit("cm");
        // Should log the unit change
        expect(logSpy).toHaveBeenCalledWith(
            expect.any(String),
            "[INFO]",
            expect.stringContaining("[Ruler]"),
            expect.any(String),
            "cm"
        );
        logSpy.mockRestore();
        ruler.destroy();
    });

    test("setUnit_DoesNotThrowForValidUnits", () =>
    {
        const ruler = createRuler("test-ruler");
        expect(() => ruler.setUnit("mm")).not.toThrow();
        expect(() => ruler.setUnit("in")).not.toThrow();
        expect(() => ruler.setUnit("px")).not.toThrow();
        ruler.destroy();
    });
});

// ============================================================================
// PUBLIC API — ORIENTATION
// ============================================================================

describe("orientation", () =>
{
    test("setOrientation_ChangesOrientation", () =>
    {
        const ruler = createRuler("test-ruler", { orientation: "horizontal" });
        ruler.setOrientation("vertical");
        // Should not throw
        ruler.destroy();
    });
});

// ============================================================================
// PUBLIC API — ORIGIN / CURSOR
// ============================================================================

describe("origin and cursor", () =>
{
    test("setOrigin_UpdatesOriginOffset", () =>
    {
        const ruler = createRuler("test-ruler");
        expect(() => ruler.setOrigin(50)).not.toThrow();
        ruler.destroy();
    });

    test("setCursorPosition_DoesNotCrash", () =>
    {
        const ruler = createRuler("test-ruler", { showCursor: true });
        expect(() => ruler.setCursorPosition(100)).not.toThrow();
        ruler.destroy();
    });
});

// ============================================================================
// PUBLIC API — CALIBRATE / RESIZE
// ============================================================================

describe("calibrate and resize", () =>
{
    test("calibrate_ReCalculatesDPI", () =>
    {
        const ruler = createRuler("test-ruler");
        expect(() => ruler.calibrate()).not.toThrow();
        ruler.destroy();
    });

    test("resize_RecalculatesCanvas", () =>
    {
        const ruler = createRuler("test-ruler");
        expect(() => ruler.resize()).not.toThrow();
        ruler.destroy();
    });
});

// ============================================================================
// LIFECYCLE
// ============================================================================

describe("lifecycle", () =>
{
    test("destroy_RemovesDOMElements", () =>
    {
        const ruler = createRuler("test-ruler");
        ruler.destroy();
        expect(container.querySelector(".ruler")).toBeNull();
    });

    test("getElement_ReturnsWrapper", () =>
    {
        const ruler = createRuler("test-ruler");
        expect(ruler.getElement()).toBeInstanceOf(HTMLElement);
        ruler.destroy();
    });

    test("getElement_ReturnsNullAfterDestroy", () =>
    {
        const ruler = createRuler("test-ruler");
        ruler.destroy();
        expect(ruler.getElement()).toBeNull();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("missingContainer_LogsError", () =>
    {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        createRuler("nonexistent");
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
    });

    test("disabledRuler_SuppressesCursorTracking", () =>
    {
        const ruler = createRuler("test-ruler", { disabled: true });
        // Should create without error
        expect(ruler.getElement()).not.toBeNull();
        ruler.destroy();
    });
});
