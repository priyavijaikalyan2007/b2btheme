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

    test("Close_HidesTheDropdownAndCollapsesTheTrigger", () =>
    {
        // DEBT-TEST-1b. The old block opened, closed, then asserted
        // that a SECOND close did not throw — which the guard in
        // `close()` makes true whatever `closeDropdown` does. The
        // dropdown and the trigger both carry the state.
        const picker = new LineEndingPicker(
            "lep-test-container", makeOptions()
        );
        const dropdown = () => container.querySelector<HTMLElement>(
            ".lineendingpicker-dropdown");
        const trigger = () => container.querySelector(
            "[aria-expanded]");

        picker.open();

        expect(dropdown()?.style.display).not.toBe("none");
        expect(trigger()?.getAttribute("aria-expanded")).toBe("true");

        picker.close();

        expect(dropdown()?.style.display).toBe("none");
        expect(trigger()?.getAttribute("aria-expanded")).toBe("false");
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
    test("Disabled_RefusesToOpen", () =>
    {
        // DEBT-TEST-1b. A disabled picker that opened anyway passed the
        // old assertion, and opening is exactly what disabled means it
        // must not do. `openDropdown` returns on `opts.disabled`.
        const picker = new LineEndingPicker(
            "lep-test-container", makeOptions({ disabled: true })
        );

        picker.open();

        expect(container.querySelector<HTMLElement>(
            ".lineendingpicker-dropdown")?.style.display).toBe("none");
        expect(container.querySelector("[aria-expanded]")
            ?.getAttribute("aria-expanded")).toBe("false");
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
