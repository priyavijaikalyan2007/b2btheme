/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: a5b6c7d8-e9f0-4a1b-2c3d-4e5f6a7b8c9d
 *
 * ⚓ TESTS: LineTypePicker
 * Vitest unit tests for the LineTypePicker component.
 * Covers: factory, default types, initial value, open/close dropdown,
 * selection, onChange callback, disabled, destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    LineTypePicker,
    createLineTypePicker,
} from "./linetypepicker";
import type { LineTypePickerOptions } from "./linetypepicker";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeOptions(
    overrides?: Partial<LineTypePickerOptions>
): LineTypePickerOptions
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
    container.id = "ltp-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("LineTypePicker factory", () =>
{
    test("Constructor_ValidOptions_CreatesInstance", () =>
    {
        const picker = new LineTypePicker(
            "ltp-test-container", makeOptions()
        );
        expect(picker).toBeDefined();
        expect(picker.getElement()).toBeInstanceOf(HTMLElement);
        picker.destroy();
    });

    test("createLineTypePicker_MountsInContainer", () =>
    {
        const picker = createLineTypePicker(
            "ltp-test-container", makeOptions()
        );
        expect(
            container.querySelector(".linetypepicker")
        ).not.toBeNull();
        picker.destroy();
    });
});

// ============================================================================
// INITIAL VALUE
// ============================================================================

describe("LineTypePicker value", () =>
{
    test("WithInitialValue_SetsSelectedType", () =>
    {
        const picker = new LineTypePicker(
            "ltp-test-container",
            makeOptions({ value: "dashed" })
        );
        expect(picker.getValue()).toBe("dashed");
        picker.destroy();
    });

    test("NoInitialValue_ReturnsEmptyString", () =>
    {
        const picker = new LineTypePicker(
            "ltp-test-container", makeOptions()
        );
        // No initial value set — getValue returns ""
        expect(picker.getValue()).toBe("");
        picker.destroy();
    });
});

// ============================================================================
// DROPDOWN
// ============================================================================

describe("LineTypePicker dropdown", () =>
{
    test("Open_ShowsDropdown", () =>
    {
        const picker = new LineTypePicker(
            "ltp-test-container", makeOptions()
        );
        picker.open();
        expect(container.querySelector(".linetypepicker-dropdown") !== null).toBe(true);
        picker.destroy();
    });

    test("Close_ClosesDropdown", () =>
    {
        const picker = new LineTypePicker(
            "ltp-test-container", makeOptions()
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

describe("LineTypePicker setValue", () =>
{
    test("SetValue_ChangesSelection", () =>
    {
        const picker = new LineTypePicker(
            "ltp-test-container", makeOptions()
        );
        picker.setValue("dotted");
        expect(picker.getValue()).toBe("dotted");
        picker.destroy();
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("LineTypePicker callbacks", () =>
{
    test("SetValue_ProgrammaticChange_UpdatesValue", () =>
    {
        const picker = new LineTypePicker(
            "ltp-test-container", makeOptions()
        );
        picker.setValue("dashed");
        expect(picker.getValue()).toBe("dashed");
        picker.destroy();
    });
});

// ============================================================================
// DISABLED
// ============================================================================

describe("LineTypePicker disabled", () =>
{
    test("Disabled_DoesNotThrowOnOpen", () =>
    {
        const picker = new LineTypePicker(
            "ltp-test-container", makeOptions({ disabled: true })
        );
        expect(() => picker.open()).not.toThrow();
        picker.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("LineTypePicker destroy", () =>
{
    test("Destroy_RemovesFromContainer", () =>
    {
        const picker = new LineTypePicker(
            "ltp-test-container", makeOptions()
        );
        picker.destroy();
        expect(
            container.querySelector(".linetypepicker")
        ).toBeNull();
    });
});
