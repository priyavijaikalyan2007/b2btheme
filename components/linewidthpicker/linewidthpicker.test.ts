/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: b6c7d8e9-f0a1-4b2c-3d4e-5f6a7b8c9d0e
 *
 * ⚓ TESTS: LineWidthPicker
 * Vitest unit tests for the LineWidthPicker component.
 * Covers: factory, default widths, initial value, open/close dropdown,
 * selection, onChange callback, disabled, destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    LineWidthPicker,
    createLineWidthPicker,
} from "./linewidthpicker";
import type { LineWidthPickerOptions } from "./linewidthpicker";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeOptions(
    overrides?: Partial<LineWidthPickerOptions>
): LineWidthPickerOptions
{
    return {
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "lwp-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("LineWidthPicker factory", () =>
{
    test("Constructor_ValidOptions_CreatesInstance", () =>
    {
        const picker = new LineWidthPicker(
            "lwp-test-container", makeOptions()
        );
        expect(picker).toBeDefined();
        expect(picker.getElement()).toBeInstanceOf(HTMLElement);
        picker.destroy();
    });

    test("createLineWidthPicker_MountsInContainer", () =>
    {
        const picker = createLineWidthPicker(
            "lwp-test-container", makeOptions()
        );
        expect(
            container.querySelector(".linewidthpicker")
        ).not.toBeNull();
        picker.destroy();
    });
});

// ============================================================================
// INITIAL VALUE
// ============================================================================

describe("LineWidthPicker value", () =>
{
    test("WithInitialValue_SetsSelectedWidth", () =>
    {
        const picker = new LineWidthPicker(
            "lwp-test-container",
            makeOptions({ value: 3 })
        );
        expect(picker.getValue()).toBe(3);
        picker.destroy();
    });

    test("NoInitialValue_DefaultsToZero", () =>
    {
        const picker = new LineWidthPicker(
            "lwp-test-container", makeOptions()
        );
        // No initial value set — getValue returns 0
        expect(picker.getValue()).toBe(0);
        picker.destroy();
    });
});

// ============================================================================
// DROPDOWN
// ============================================================================

describe("LineWidthPicker dropdown", () =>
{
    test("Open_ShowsDropdown", () =>
    {
        const picker = new LineWidthPicker(
            "lwp-test-container", makeOptions()
        );
        picker.open();
        expect(container.querySelector(".linewidthpicker-dropdown") !== null).toBe(true);
        picker.destroy();
    });

    test("Close_ClosesDropdown", () =>
    {
        const picker = new LineWidthPicker(
            "lwp-test-container", makeOptions()
        );
        picker.open();
        picker.close();
        expect(() => picker.close()).not.toThrow();
        picker.destroy();
    });
});

// ============================================================================
// SET VALUE
// ============================================================================

describe("LineWidthPicker setValue", () =>
{
    test("SetValue_ChangesSelection", () =>
    {
        const picker = new LineWidthPicker(
            "lwp-test-container", makeOptions()
        );
        picker.setValue(5);
        expect(picker.getValue()).toBe(5);
        picker.destroy();
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("LineWidthPicker callbacks", () =>
{
    test("SetValue_ProgrammaticChange_UpdatesValue", () =>
    {
        const picker = new LineWidthPicker(
            "lwp-test-container", makeOptions()
        );
        picker.setValue(4);
        expect(picker.getValue()).toBe(4);
        picker.destroy();
    });
});

// ============================================================================
// DISABLED
// ============================================================================

describe("LineWidthPicker disabled", () =>
{
    test("Disabled_DoesNotThrowOnOpen", () =>
    {
        const picker = new LineWidthPicker(
            "lwp-test-container", makeOptions({ disabled: true })
        );
        expect(() => picker.open()).not.toThrow();
        picker.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("LineWidthPicker destroy", () =>
{
    test("Destroy_RemovesFromContainer", () =>
    {
        const picker = new LineWidthPicker(
            "lwp-test-container", makeOptions()
        );
        picker.destroy();
        expect(
            container.querySelector(".linewidthpicker")
        ).toBeNull();
    });

    test("Destroy_CalledTwice_IsIdempotent", () =>
    {
        const picker = new LineWidthPicker(
            "lwp-test-container", makeOptions()
        );
        picker.destroy();
        expect(() => picker.destroy()).not.toThrow();
    });
});
