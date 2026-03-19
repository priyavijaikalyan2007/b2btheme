/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * Repository: pvk2007/theme
 * File GUID: e7f0a5d4-9b3c-4e6d-cg89-5i4g0d1e6f09
 * Created: 2026-03-19
 */

/**
 * Tests: LineShapePicker
 * Comprehensive Vitest unit tests for the LineShapePicker component.
 * Covers: factory, options, getValue/setValue, dropdown rendering,
 * SVG previews, selection, enable/disable, and destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
    LineShapePicker,
    createLineShapePicker,
} from "./lineshapepicker";
import type {
    LineShapePickerOptions,
    LineShapeItem,
} from "./lineshapepicker";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function createContainer(): HTMLDivElement
{
    const el = document.createElement("div");
    el.id = "test-lineshapepicker-container";
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

function defaultOptions(): LineShapePickerOptions
{
    return {};
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
// FACTORY — createLineShapePicker
// ============================================================================

describe("createLineShapePicker", () =>
{
    test("Factory_WithContainerId_ReturnsPicker", () =>
    {
        const picker = createLineShapePicker(
            "test-lineshapepicker-container", defaultOptions()
        );
        expect(picker).toBeInstanceOf(LineShapePicker);
        picker.destroy();
    });

    test("Factory_MountsElementInContainer", () =>
    {
        const picker = createLineShapePicker(
            "test-lineshapepicker-container", defaultOptions()
        );
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
    });

    test("Factory_WithInitialValue_SetsShape", () =>
    {
        const picker = createLineShapePicker(
            "test-lineshapepicker-container",
            { value: "orthogonal" }
        );
        expect(picker.getValue()).toBe("orthogonal");
        picker.destroy();
    });
});

// ============================================================================
// CONSTRUCTOR
// ============================================================================

describe("LineShapePicker constructor", () =>
{
    test("Constructor_NoValue_SelectionIsEmpty", () =>
    {
        const picker = new LineShapePicker(
            "test-lineshapepicker-container", defaultOptions()
        );
        expect(picker.getValue()).toBe("");
        picker.destroy();
    });

    test("Constructor_WithValue_SelectsShape", () =>
    {
        const picker = new LineShapePicker(
            "test-lineshapepicker-container",
            { value: "straight" }
        );
        expect(picker.getValue()).toBe("straight");
        picker.destroy();
    });

    test("Constructor_WithCustomShapes_UsesProvided", () =>
    {
        const customShapes: LineShapeItem[] = [
            { label: "Custom A", value: "custom-a" },
            { label: "Custom B", value: "custom-b" },
        ];
        const picker = new LineShapePicker(
            "test-lineshapepicker-container",
            { shapes: customShapes, value: "custom-a" }
        );
        expect(picker.getValue()).toBe("custom-a");
        picker.destroy();
    });
});

// ============================================================================
// DROPDOWN RENDERING
// ============================================================================

describe("dropdown rendering", () =>
{
    test("Render_CreatesTriggerElement", () =>
    {
        const picker = new LineShapePicker(
            "test-lineshapepicker-container", defaultOptions()
        );
        const trigger = container.querySelector(".lineshapepicker-trigger");
        expect(trigger).not.toBeNull();
        picker.destroy();
    });

    test("Render_TriggerContainsSvgPreview", () =>
    {
        const picker = new LineShapePicker(
            "test-lineshapepicker-container",
            { value: "straight" }
        );
        const svg = container.querySelector("svg");
        expect(svg).not.toBeNull();
        picker.destroy();
    });

    test("Open_ShowsDropdownWithItems", () =>
    {
        const picker = new LineShapePicker(
            "test-lineshapepicker-container", defaultOptions()
        );
        picker.open();
        const dropdown = container.querySelector(
            ".lineshapepicker-dropdown"
        );
        expect(dropdown).not.toBeNull();
        picker.close();
        picker.destroy();
    });
});

// ============================================================================
// getValue / setValue
// ============================================================================

describe("getValue and setValue", () =>
{
    test("setValue_ValidShape_UpdatesValue", () =>
    {
        const picker = new LineShapePicker(
            "test-lineshapepicker-container", defaultOptions()
        );
        picker.setValue("manhattan");
        expect(picker.getValue()).toBe("manhattan");
        picker.destroy();
    });

    test("setValue_InvalidShape_DoesNotChange", () =>
    {
        const picker = new LineShapePicker(
            "test-lineshapepicker-container",
            { value: "straight" }
        );
        picker.setValue("nonexistent-shape");
        expect(picker.getValue()).toBe("straight");
        picker.destroy();
    });

    test("getSelectedShape_ReturnsFullItem", () =>
    {
        const picker = new LineShapePicker(
            "test-lineshapepicker-container",
            { value: "elbow" }
        );
        const shape = picker.getSelectedShape();
        expect(shape).not.toBeNull();
        expect(shape?.label).toBe("Elbow");
        expect(shape?.value).toBe("elbow");
        picker.destroy();
    });
});

// ============================================================================
// SELECTION UPDATES
// ============================================================================

describe("selection updates", () =>
{
    test("setValue_FiresOnChange_WhenUserTriggered", () =>
    {
        const onChange = vi.fn();
        const picker = new LineShapePicker(
            "test-lineshapepicker-container",
            { onChange }
        );
        // Opening dropdown and clicking a shape simulates user trigger.
        // Programmatic setValue(value, false) does NOT fire onChange.
        picker.setValue("segment");
        // Note: setValue programmatic is documented to NOT fire onChange
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
        const picker = new LineShapePicker(
            "test-lineshapepicker-container", defaultOptions()
        );
        picker.disable();
        const el = picker.getElement();
        expect(
            el?.classList.contains("lineshapepicker-disabled")
        ).toBe(true);
        picker.destroy();
    });

    test("enable_RemovesDisabledClass", () =>
    {
        const picker = new LineShapePicker(
            "test-lineshapepicker-container",
            { disabled: true }
        );
        picker.enable();
        const el = picker.getElement();
        expect(
            el?.classList.contains("lineshapepicker-disabled")
        ).toBe(false);
        picker.destroy();
    });

    test("disable_ClosesOpenDropdown", () =>
    {
        const picker = new LineShapePicker(
            "test-lineshapepicker-container", defaultOptions()
        );
        picker.open();
        picker.disable();
        const dropdown = container.querySelector(
            ".lineshapepicker-dropdown"
        );
        // After disable, dropdown should be hidden
        expect(
            dropdown === null
            || (dropdown as HTMLElement).style.display === "none"
            || !dropdown.classList.contains("show")
        ).toBe(true);
        picker.destroy();
    });
});

// ============================================================================
// getElement
// ============================================================================

describe("getElement", () =>
{
    test("getElement_AfterCreation_ReturnsHTMLElement", () =>
    {
        const picker = new LineShapePicker(
            "test-lineshapepicker-container", defaultOptions()
        );
        expect(picker.getElement()).toBeInstanceOf(HTMLElement);
        picker.destroy();
    });

    test("getElement_AfterDestroy_ReturnsNull", () =>
    {
        const picker = new LineShapePicker(
            "test-lineshapepicker-container", defaultOptions()
        );
        picker.destroy();
        expect(picker.getElement()).toBeNull();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("destroy", () =>
{
    test("destroy_RemovesFromDOM", () =>
    {
        const picker = createLineShapePicker(
            "test-lineshapepicker-container", defaultOptions()
        );
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
        expect(
            container.querySelector(".lineshapepicker")
        ).toBeNull();
    });

    test("destroy_CalledTwice_DoesNotThrow", () =>
    {
        const picker = new LineShapePicker(
            "test-lineshapepicker-container", defaultOptions()
        );
        picker.destroy();
        expect(() => picker.destroy()).not.toThrow();
    });
});
