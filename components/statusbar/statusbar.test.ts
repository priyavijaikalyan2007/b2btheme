/**
 * ⚓ TESTS: StatusBar
 * Comprehensive Vitest unit tests for the StatusBar component.
 * Covers: factory, constructor, options, region rendering, setValue,
 * getValue, setIcon, addRegion, removeRegion, show, hide, contained,
 * and destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    StatusBar,
    createStatusBar,
} from "./statusbar";
import type { StatusBarOptions, StatusBarRegion } from "./statusbar";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeRegions(): StatusBarRegion[]
{
    return [
        { id: "status", icon: "bi-circle-fill", value: "Connected" },
        { id: "env", label: "Environment:", value: "Production" },
        { id: "user", label: "User:", value: "jsmith" },
    ];
}

function makeOptions(overrides?: Partial<StatusBarOptions>): StatusBarOptions
{
    return {
        regions: makeRegions(),
        contained: true,
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "statusbar-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY — createStatusBar
// ============================================================================

describe("createStatusBar", () =>
{
    test("createStatusBar_ValidOptions_ReturnsStatusBarInstance", () =>
    {
        const bar = createStatusBar(makeOptions());
        expect(bar).toBeInstanceOf(StatusBar);
        bar.destroy();
    });

    test("createStatusBar_ValidOptions_IsVisible", () =>
    {
        const bar = createStatusBar(makeOptions());
        expect(bar.isVisible()).toBe(true);
        bar.destroy();
    });
});

// ============================================================================
// CONSTRUCTOR
// ============================================================================

describe("StatusBar constructor", () =>
{
    test("Constructor_DefaultSize_IsMd", () =>
    {
        const bar = new StatusBar(makeOptions());
        const el = bar.getElement();
        expect(el?.classList.contains("statusbar-md")).toBe(true);
        bar.destroy();
    });

    test("Constructor_SizeSm_HasSmClass", () =>
    {
        const bar = new StatusBar(makeOptions({ size: "sm" }));
        const el = bar.getElement();
        expect(el?.classList.contains("statusbar-sm")).toBe(true);
        bar.destroy();
    });

    test("Constructor_SizeLg_HasLgClass", () =>
    {
        const bar = new StatusBar(makeOptions({ size: "lg" }));
        const el = bar.getElement();
        expect(el?.classList.contains("statusbar-lg")).toBe(true);
        bar.destroy();
    });

    test("Constructor_GetElement_ReturnsHTMLElement", () =>
    {
        const bar = new StatusBar(makeOptions());
        expect(bar.getElement()).toBeInstanceOf(HTMLElement);
        bar.destroy();
    });
});

// ============================================================================
// REGION RENDERING
// ============================================================================

describe("StatusBar region rendering", () =>
{
    test("Show_ThreeRegions_RendersThreeRegionSpans", () =>
    {
        const bar = new StatusBar(makeOptions());
        bar.show(container);
        const regions = container.querySelectorAll(".statusbar-region");
        expect(regions.length).toBe(3);
        bar.destroy();
    });

    test("Show_RegionWithIcon_RendersIconElement", () =>
    {
        const bar = new StatusBar(makeOptions());
        bar.show(container);
        const icons = container.querySelectorAll(".statusbar-icon");
        expect(icons.length).toBeGreaterThan(0);
        bar.destroy();
    });

    test("Show_RegionWithLabel_RendersLabelSpan", () =>
    {
        const bar = new StatusBar(makeOptions());
        bar.show(container);
        const labels = container.querySelectorAll(".statusbar-label");
        expect(labels.length).toBe(2); // "Environment:" and "User:"
        bar.destroy();
    });

    test("Show_DefaultDividers_RendersDividers", () =>
    {
        const bar = new StatusBar(makeOptions());
        bar.show(container);
        const dividers = container.querySelectorAll(".statusbar-divider");
        expect(dividers.length).toBe(2); // between 3 regions
        bar.destroy();
    });

    test("Show_DividersDisabled_NoDividers", () =>
    {
        const bar = new StatusBar(makeOptions({ showDividers: false }));
        bar.show(container);
        const dividers = container.querySelectorAll(".statusbar-divider");
        expect(dividers.length).toBe(0);
        bar.destroy();
    });

    test("Show_HasStatusRole", () =>
    {
        const bar = new StatusBar(makeOptions());
        bar.show(container);
        const el = bar.getElement();
        expect(el?.getAttribute("role")).toBe("status");
        bar.destroy();
    });

    test("Show_HasAriaLivePolite", () =>
    {
        const bar = new StatusBar(makeOptions());
        bar.show(container);
        const el = bar.getElement();
        expect(el?.getAttribute("aria-live")).toBe("polite");
        bar.destroy();
    });
});

// ============================================================================
// HANDLE — setValue / getValue
// ============================================================================

describe("StatusBar setValue / getValue", () =>
{
    test("GetValue_ValidRegion_ReturnsValue", () =>
    {
        const bar = new StatusBar(makeOptions());
        bar.show(container);
        expect(bar.getValue("status")).toBe("Connected");
        bar.destroy();
    });

    test("SetValue_ValidRegion_UpdatesValue", () =>
    {
        const bar = new StatusBar(makeOptions());
        bar.show(container);
        bar.setValue("status", "Disconnected");
        expect(bar.getValue("status")).toBe("Disconnected");
        bar.destroy();
    });

    test("GetValue_InvalidRegion_ReturnsEmptyString", () =>
    {
        const bar = new StatusBar(makeOptions());
        bar.show(container);
        expect(bar.getValue("nonexistent")).toBe("");
        bar.destroy();
    });
});

// ============================================================================
// HANDLE — addRegion / removeRegion
// ============================================================================

describe("StatusBar addRegion / removeRegion", () =>
{
    test("AddRegion_NewRegion_IncreasesCount", () =>
    {
        const bar = new StatusBar(makeOptions());
        bar.show(container);
        bar.addRegion({ id: "new-region", value: "New" });
        const regions = container.querySelectorAll(".statusbar-region");
        expect(regions.length).toBe(4);
        bar.destroy();
    });

    test("RemoveRegion_ExistingRegion_DecreasesCount", () =>
    {
        const bar = new StatusBar(makeOptions());
        bar.show(container);
        bar.removeRegion("user");
        const regions = container.querySelectorAll(".statusbar-region");
        expect(regions.length).toBe(2);
        bar.destroy();
    });
});

// ============================================================================
// HANDLE — show / hide
// ============================================================================

describe("StatusBar show / hide", () =>
{
    test("Hide_AfterShow_SetsInvisible", () =>
    {
        const bar = new StatusBar(makeOptions());
        bar.show(container);
        expect(bar.isVisible()).toBe(true);
        bar.hide();
        expect(bar.isVisible()).toBe(false);
        bar.destroy();
    });

    test("ShowTwice_IsIdempotent", () =>
    {
        const bar = new StatusBar(makeOptions());
        bar.show(container);
        bar.show(container); // second call should warn but not error
        expect(bar.isVisible()).toBe(true);
        bar.destroy();
    });
});

// ============================================================================
// CONTAINED MODE
// ============================================================================

describe("StatusBar contained mode", () =>
{
    test("SetContained_True_AddsContainedClass", () =>
    {
        const bar = new StatusBar(makeOptions({ contained: false }));
        bar.show(container);
        bar.setContained(true);
        expect(bar.isContained()).toBe(true);
        expect(bar.getElement()?.classList.contains("statusbar-contained")).toBe(true);
        bar.destroy();
    });

    test("Constructor_ContainedTrue_StartsContained", () =>
    {
        const bar = new StatusBar(makeOptions({ contained: true }));
        expect(bar.isContained()).toBe(true);
        bar.destroy();
    });
});

// ============================================================================
// HANDLE — destroy
// ============================================================================

describe("StatusBar destroy", () =>
{
    test("Destroy_AfterShow_SetsInvisible", () =>
    {
        const bar = new StatusBar(makeOptions());
        bar.show(container);
        bar.destroy();
        expect(bar.isVisible()).toBe(false);
        bar.destroy();
    });

    test("Destroy_GetElement_ReturnsNull", () =>
    {
        const bar = new StatusBar(makeOptions());
        bar.show(container);
        bar.destroy();
        expect(bar.getElement()).toBeNull();
    });

    test("Destroy_CalledTwice_IsIdempotent", () =>
    {
        const bar = new StatusBar(makeOptions());
        bar.show(container);
        bar.destroy();
        expect(() => bar.destroy()).not.toThrow();
    });
});
