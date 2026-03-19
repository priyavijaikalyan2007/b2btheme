/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: Magnifier
 * Vitest unit tests for the Magnifier component.
 * Covers: factory, options, DOM structure, ARIA, enable/disable,
 * zoom, diameter, target resolution, callbacks, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    Magnifier,
    createMagnifier,
} from "./magnifier";
import type
{
    MagnifierOptions,
} from "./magnifier";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;
let targetEl: HTMLElement;

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "test-magnifier";
    document.body.appendChild(container);

    targetEl = document.createElement("div");
    targetEl.id = "magnifier-target";
    targetEl.style.width = "400px";
    targetEl.style.height = "300px";
    targetEl.textContent = "Target content for magnification";
    document.body.appendChild(targetEl);
});

afterEach(() =>
{
    document.body.innerHTML = "";
});

// ============================================================================
// FACTORY — createMagnifier
// ============================================================================

describe("createMagnifier", () =>
{
    test("returnsMagnifierInstance", () =>
    {
        const mag = createMagnifier("test-magnifier");
        expect(mag).toBeInstanceOf(Magnifier);
        mag.destroy();
    });

    test("withOptions_CreatesWithConfig", () =>
    {
        const mag = createMagnifier("test-magnifier", { zoom: 3, diameter: 200 });
        expect(mag.getElement()).not.toBeNull();
        mag.destroy();
    });

    test("defaultTarget_IsDocumentBody", () =>
    {
        const mag = createMagnifier("test-magnifier");
        // Lens should be created and appended to body
        const lens = document.querySelector(".magnifier-lens");
        expect(lens).not.toBeNull();
        mag.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("DOM structure", () =>
{
    test("lensElement_HasMagnifierLensClass", () =>
    {
        const mag = createMagnifier("test-magnifier");
        const lens = document.querySelector(".magnifier-lens");
        expect(lens).not.toBeNull();
        mag.destroy();
    });

    test("lensIsHiddenByDefault", () =>
    {
        const mag = createMagnifier("test-magnifier");
        const lens = document.querySelector(".magnifier-lens") as HTMLElement;
        expect(lens?.style.display).toBe("none");
        mag.destroy();
    });

    test("withCrosshair_RendersCrosshairElement", () =>
    {
        const mag = createMagnifier("test-magnifier", {
            showCrosshair: true,
        });
        const crosshair = document.querySelector(".magnifier-crosshair");
        expect(crosshair).not.toBeNull();
        mag.destroy();
    });

    test("withoutCrosshair_OmitsCrosshair", () =>
    {
        const mag = createMagnifier("test-magnifier", {
            showCrosshair: false,
        });
        const crosshair = document.querySelector(".magnifier-crosshair");
        expect(crosshair).toBeNull();
        mag.destroy();
    });
});

// ============================================================================
// ARIA / ACCESSIBILITY
// ============================================================================

describe("accessibility", () =>
{
    test("lensHasAriaHidden", () =>
    {
        const mag = createMagnifier("test-magnifier");
        const lens = document.querySelector(".magnifier-lens");
        expect(lens?.getAttribute("aria-hidden")).toBe("true");
        mag.destroy();
    });
});

// ============================================================================
// PUBLIC API — ENABLE / DISABLE
// ============================================================================

describe("enable and disable", () =>
{
    test("disable_StopsMagnification", () =>
    {
        const mag = createMagnifier("test-magnifier", {
            target: "magnifier-target",
        });
        mag.disable();
        // Lens should be hidden after disable
        const lens = document.querySelector(".magnifier-lens") as HTMLElement;
        expect(lens?.style.display).toBe("none");
        mag.destroy();
    });

    test("enable_ResumesMagnification", () =>
    {
        const mag = createMagnifier("test-magnifier", {
            target: "magnifier-target",
            disabled: true,
        });
        mag.enable();
        // Should not crash and enable tracking
        mag.destroy();
    });

    test("enableWhenAlreadyEnabled_IsIdempotent", () =>
    {
        const mag = createMagnifier("test-magnifier", {
            target: "magnifier-target",
        });
        mag.enable();
        // No error expected
        mag.destroy();
    });

    test("disableWhenAlreadyDisabled_IsIdempotent", () =>
    {
        const mag = createMagnifier("test-magnifier", {
            target: "magnifier-target",
            disabled: true,
        });
        mag.disable();
        // No error expected
        mag.destroy();
    });
});

// ============================================================================
// PUBLIC API — ZOOM / DIAMETER
// ============================================================================

describe("zoom and diameter", () =>
{
    test("setZoom_UpdatesZoomFactor", () =>
    {
        const mag = createMagnifier("test-magnifier");
        expect(() => mag.setZoom(4)).not.toThrow();
        mag.destroy();
    });

    test("setZoom_WithZero_LogsWarning", () =>
    {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const mag = createMagnifier("test-magnifier");
        mag.setZoom(0);
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
        mag.destroy();
    });

    test("setZoom_WithNegative_LogsWarning", () =>
    {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const mag = createMagnifier("test-magnifier");
        mag.setZoom(-2);
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
        mag.destroy();
    });

    test("setDiameter_UpdatesLensSize", () =>
    {
        const mag = createMagnifier("test-magnifier");
        mag.setDiameter(250);
        const lens = document.querySelector(".magnifier-lens") as HTMLElement;
        expect(lens?.style.width).toBe("250px");
        mag.destroy();
    });

    test("setDiameter_WithNegative_LogsWarning", () =>
    {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const mag = createMagnifier("test-magnifier");
        mag.setDiameter(-10);
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
        mag.destroy();
    });
});

// ============================================================================
// TARGET RESOLUTION
// ============================================================================

describe("target resolution", () =>
{
    test("stringTarget_ResolvesById", () =>
    {
        const mag = createMagnifier("test-magnifier", {
            target: "magnifier-target",
        });
        expect(mag.getElement()).not.toBeNull();
        mag.destroy();
    });

    test("elementTarget_UsesDirectly", () =>
    {
        const mag = createMagnifier("test-magnifier", {
            target: targetEl,
        });
        expect(mag.getElement()).not.toBeNull();
        mag.destroy();
    });
});

// ============================================================================
// LIFECYCLE
// ============================================================================

describe("lifecycle", () =>
{
    test("destroy_RemovesLensFromDOM", () =>
    {
        const mag = createMagnifier("test-magnifier");
        mag.destroy();
        expect(document.querySelector(".magnifier-lens")).toBeNull();
    });

    test("getElement_ReturnsLens", () =>
    {
        const mag = createMagnifier("test-magnifier");
        expect(mag.getElement()).toBeInstanceOf(HTMLElement);
        mag.destroy();
    });

    test("getElement_ReturnsNullAfterDestroy", () =>
    {
        const mag = createMagnifier("test-magnifier");
        mag.destroy();
        expect(mag.getElement()).toBeNull();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("invalidStringTarget_LogsError", () =>
    {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const mag = createMagnifier("test-magnifier", {
            target: "nonexistent-element",
        });
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
        mag.destroy();
    });

    test("defaultOptions_UsesDefaults", () =>
    {
        const mag = createMagnifier("test-magnifier");
        // Default zoom=2, diameter=150; lens should reflect these
        const lens = document.querySelector(".magnifier-lens") as HTMLElement;
        expect(lens?.style.width).toBe("150px");
        expect(lens?.style.height).toBe("150px");
        mag.destroy();
    });
});
