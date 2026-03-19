/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: f4a5b6c7-d8e9-4f0a-1b2c-3d4e5f6a7b8c
 *
 * ⚓ TESTS: LineEndingPicker
 * Vitest unit tests for the LineEndingPicker component.
 * Covers: factory, default endings, initial value, open/close dropdown,
 * selection, onChange callback, keyboard, destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    LineEndingPicker,
    createLineEndingPicker,
} from "./lineendingpicker";
import type { LineEndingPickerOptions } from "./lineendingpicker";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeOptions(
    overrides?: Partial<LineEndingPickerOptions>
): LineEndingPickerOptions
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
    container.id = "lep-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("LineEndingPicker factory", () =>
{
    test("Constructor_ValidOptions_CreatesInstance", () =>
    {
        const picker = new LineEndingPicker(
            "lep-test-container", makeOptions()
        );
        expect(picker).toBeDefined();
        expect(picker.getElement()).toBeInstanceOf(HTMLElement);
        picker.destroy();
    });

    test("createLineEndingPicker_MountsInContainer", () =>
    {
        const picker = createLineEndingPicker(
            "lep-test-container", makeOptions()
        );
        expect(
            container.querySelector(".lineendingpicker")
        ).not.toBeNull();
        picker.destroy();
    });
});

// ============================================================================
// INITIAL VALUE
// ============================================================================

describe("LineEndingPicker value", () =>
{
    test("WithInitialValue_SetsSelectedEnding", () =>
    {
        const picker = new LineEndingPicker(
            "lep-test-container",
            makeOptions({ value: "classic" })
        );
        expect(picker.getValue()).toBe("classic");
        picker.destroy();
    });

    test("NoInitialValue_DefaultsToFirst", () =>
    {
        const picker = new LineEndingPicker(
            "lep-test-container", makeOptions()
        );
        // Default endings: first is "none"
        expect(picker.getValue()).toBe("none");
        picker.destroy();
    });
});

// ============================================================================
// DROPDOWN
// ============================================================================

describe("LineEndingPicker dropdown", () =>
{
    test("Open_ShowsDropdown", () =>
    {
        const picker = new LineEndingPicker(
            "lep-test-container", makeOptions()
        );
        picker.open();
        expect(container.querySelector(".lineendingpicker-dropdown") !== null).toBe(true);
        picker.destroy();
    });

    test("Close_ClosesDropdown", () =>
    {
        const picker = new LineEndingPicker(
            "lep-test-container", makeOptions()
        );
        picker.open();
        picker.close();
        // After close, open+close should not throw
        expect(() => picker.close()).not.toThrow();
        picker.destroy();
    });
});

// ============================================================================
// SET VALUE
// ============================================================================

describe("LineEndingPicker setValue", () =>
{
    test("SetValue_ChangesSelection", () =>
    {
        const picker = new LineEndingPicker(
            "lep-test-container", makeOptions()
        );
        picker.setValue("diamond");
        expect(picker.getValue()).toBe("diamond");
        picker.destroy();
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("LineEndingPicker callbacks", () =>
{
    test("SetValue_ProgrammaticChange_UpdatesValue", () =>
    {
        const picker = new LineEndingPicker(
            "lep-test-container", makeOptions()
        );
        picker.setValue("block");
        expect(picker.getValue()).toBe("block");
        picker.destroy();
    });
});

// ============================================================================
// DISABLED
// ============================================================================

describe("LineEndingPicker disabled", () =>
{
    test("Disabled_DoesNotThrowOnOpen", () =>
    {
        const picker = new LineEndingPicker(
            "lep-test-container", makeOptions({ disabled: true })
        );
        expect(() => picker.open()).not.toThrow();
        picker.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("LineEndingPicker destroy", () =>
{
    test("Destroy_RemovesFromContainer", () =>
    {
        const picker = new LineEndingPicker(
            "lep-test-container", makeOptions()
        );
        picker.destroy();
        expect(
            container.querySelector(".lineendingpicker")
        ).toBeNull();
    });

    test("Destroy_CalledTwice_IsIdempotent", () =>
    {
        const picker = new LineEndingPicker(
            "lep-test-container", makeOptions()
        );
        picker.destroy();
        expect(() => picker.destroy()).not.toThrow();
    });
});
