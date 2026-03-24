/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * Repository: pvk2007/theme
 * File GUID: e4b8f0d2-6a39-4c7b-af2d-9e3g1b5c8f42
 * Created: 2026-03-24
 */

/**
 * Tests: OrientationPicker
 * Vitest unit tests for the OrientationPicker component.
 * Covers: creation, default value, setValue, getValue, onChange callback,
 * show/hide, destroy, and keyboard navigation.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createOrientationPicker } from "./orientationpicker";
import type { OrientationPickerOptions } from "./orientationpicker";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function createContainer(): HTMLDivElement
{
    const el = document.createElement("div");
    el.id = "test-op-container";
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

function defaultOptions(
    overrides?: Partial<OrientationPickerOptions>
): OrientationPickerOptions
{
    return {
        container: "test-op-container",
        ...overrides,
    };
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
// CREATION
// ============================================================================

describe("createOrientationPicker", () =>
{
    test("Factory_WithContainerId_MountsElement", () =>
    {
        const picker = createOrientationPicker(defaultOptions());
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
    });

    test("Factory_WithHTMLElement_MountsElement", () =>
    {
        const picker = createOrientationPicker({ container });
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
    });

    test("Factory_InvalidContainer_LogsError", () =>
    {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        const picker = createOrientationPicker({ container: "nonexistent" });
        expect(spy).toHaveBeenCalledWith(
            "[OrientationPicker]",
            "container not found:",
            "nonexistent"
        );
        spy.mockRestore();
        picker.destroy();
    });

    test("Factory_RendersTriggerButton", () =>
    {
        const picker = createOrientationPicker(defaultOptions());
        const trigger = container.querySelector(".orientationpicker-trigger");
        expect(trigger).not.toBeNull();
        picker.destroy();
    });

    test("Factory_RendersPanel", () =>
    {
        const picker = createOrientationPicker(defaultOptions());
        picker.show();
        const panel = document.body.querySelector(".orientationpicker-panel");
        expect(panel).not.toBeNull();
        picker.destroy();
    });

    test("Factory_RendersTwoItems", () =>
    {
        const picker = createOrientationPicker(defaultOptions());
        picker.show();
        const items = document.body.querySelectorAll(".orientationpicker-item");
        expect(items.length).toBe(2);
        picker.destroy();
    });
});

// ============================================================================
// DEFAULT VALUE
// ============================================================================

describe("default value", () =>
{
    test("getValue_DefaultIsPortrait", () =>
    {
        const picker = createOrientationPicker(defaultOptions());
        expect(picker.getValue()).toBe("portrait");
        picker.destroy();
    });

    test("getValue_WithLandscapeOption_IsLandscape", () =>
    {
        const picker = createOrientationPicker(
            defaultOptions({ value: "landscape" })
        );
        expect(picker.getValue()).toBe("landscape");
        picker.destroy();
    });

    test("Default_PortraitItemHasActiveClass", () =>
    {
        const picker = createOrientationPicker(defaultOptions());
        picker.show();
        const active = document.body.querySelector(
            '.orientationpicker-item--active'
        );
        expect(active?.getAttribute("data-value")).toBe("portrait");
        picker.destroy();
    });
});

// ============================================================================
// setValue / getValue
// ============================================================================

describe("setValue and getValue", () =>
{
    test("setValue_Landscape_UpdatesValue", () =>
    {
        const picker = createOrientationPicker(defaultOptions());
        picker.setValue("landscape");
        expect(picker.getValue()).toBe("landscape");
        picker.destroy();
    });

    test("setValue_Portrait_UpdatesValue", () =>
    {
        const picker = createOrientationPicker(
            defaultOptions({ value: "landscape" })
        );
        picker.setValue("portrait");
        expect(picker.getValue()).toBe("portrait");
        picker.destroy();
    });

    test("setValue_UpdatesActiveItem", () =>
    {
        const picker = createOrientationPicker(defaultOptions());
        picker.show();
        picker.setValue("landscape");
        const active = document.body.querySelector(
            '.orientationpicker-item--active'
        );
        expect(active?.getAttribute("data-value")).toBe("landscape");
        picker.destroy();
    });

    test("setValue_UpdatesTriggerLabel", () =>
    {
        const picker = createOrientationPicker(defaultOptions());
        picker.setValue("landscape");
        const label = container.querySelector(
            ".orientationpicker-trigger-label"
        );
        expect(label?.textContent).toBe("Landscape");
        picker.destroy();
    });

    test("setValue_InvalidValue_LogsWarning", () =>
    {
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const picker = createOrientationPicker(defaultOptions());
        picker.setValue("invalid" as "portrait");
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
        picker.destroy();
    });
});

// ============================================================================
// onChange CALLBACK
// ============================================================================

describe("onChange callback", () =>
{
    test("ItemClick_FiresOnChange", () =>
    {
        const onChange = vi.fn();
        const picker = createOrientationPicker(
            defaultOptions({ onChange })
        );
        picker.show();

        // Click the landscape item
        const items = document.body.querySelectorAll(".orientationpicker-item");
        const landscapeItem = items[1] as HTMLElement;
        landscapeItem.click();

        expect(onChange).toHaveBeenCalledWith("landscape");
        picker.destroy();
    });

    test("ItemClick_SameValue_StillFiresOnChange", () =>
    {
        const onChange = vi.fn();
        const picker = createOrientationPicker(
            defaultOptions({ onChange })
        );
        picker.show();

        // Click the portrait item (already selected)
        const items = document.body.querySelectorAll(".orientationpicker-item");
        const portraitItem = items[0] as HTMLElement;
        portraitItem.click();

        expect(onChange).toHaveBeenCalledWith("portrait");
        picker.destroy();
    });
});

// ============================================================================
// SHOW / HIDE
// ============================================================================

describe("show and hide", () =>
{
    test("show_OpensPanelAndAddsOpenClass", () =>
    {
        const picker = createOrientationPicker(defaultOptions());
        picker.show();
        const root = container.querySelector(".orientationpicker");
        expect(root?.classList.contains("orientationpicker--open")).toBe(true);
        picker.destroy();
    });

    test("hide_ClosesPanelAndRemovesOpenClass", () =>
    {
        const picker = createOrientationPicker(defaultOptions());
        picker.show();
        picker.hide();
        const root = container.querySelector(".orientationpicker");
        expect(root?.classList.contains("orientationpicker--open")).toBe(false);
        picker.destroy();
    });

    test("show_SetsAriaExpandedTrue", () =>
    {
        const picker = createOrientationPicker(defaultOptions());
        picker.show();
        const trigger = container.querySelector(".orientationpicker-trigger");
        expect(trigger?.getAttribute("aria-expanded")).toBe("true");
        picker.destroy();
    });

    test("hide_SetsAriaExpandedFalse", () =>
    {
        const picker = createOrientationPicker(defaultOptions());
        picker.show();
        picker.hide();
        const trigger = container.querySelector(".orientationpicker-trigger");
        expect(trigger?.getAttribute("aria-expanded")).toBe("false");
        picker.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("destroy", () =>
{
    test("destroy_RemovesFromDOM", () =>
    {
        const picker = createOrientationPicker(defaultOptions());
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
        expect(container.querySelector(".orientationpicker")).toBeNull();
    });

    test("destroy_CalledTwice_DoesNotThrow", () =>
    {
        const picker = createOrientationPicker(defaultOptions());
        picker.destroy();
        expect(() => picker.destroy()).not.toThrow();
    });
});

// ============================================================================
// KEYBOARD NAVIGATION
// ============================================================================

describe("keyboard navigation", () =>
{
    test("Enter_OnItem_SelectsValue", () =>
    {
        const onChange = vi.fn();
        const picker = createOrientationPicker(
            defaultOptions({ onChange })
        );
        picker.show();

        const items = document.body.querySelectorAll(".orientationpicker-item");
        const landscapeItem = items[1] as HTMLElement;
        const event = new KeyboardEvent("keydown", {
            key: "Enter", bubbles: true,
        });
        landscapeItem.dispatchEvent(event);

        expect(onChange).toHaveBeenCalledWith("landscape");
        picker.destroy();
    });

    test("Space_OnItem_SelectsValue", () =>
    {
        const onChange = vi.fn();
        const picker = createOrientationPicker(
            defaultOptions({ onChange })
        );
        picker.show();

        const items = document.body.querySelectorAll(".orientationpicker-item");
        const landscapeItem = items[1] as HTMLElement;
        const event = new KeyboardEvent("keydown", {
            key: " ", bubbles: true,
        });
        landscapeItem.dispatchEvent(event);

        expect(onChange).toHaveBeenCalledWith("landscape");
        picker.destroy();
    });

    test("Escape_OnItem_ClosesPanel", () =>
    {
        const picker = createOrientationPicker(defaultOptions());
        picker.show();

        const items = document.body.querySelectorAll(".orientationpicker-item");
        const item = items[0] as HTMLElement;
        const event = new KeyboardEvent("keydown", {
            key: "Escape", bubbles: true,
        });
        item.dispatchEvent(event);

        const root = container.querySelector(".orientationpicker");
        expect(root?.classList.contains("orientationpicker--open")).toBe(false);
        picker.destroy();
    });

    test("ArrowDown_OnTrigger_OpensPanel", () =>
    {
        const picker = createOrientationPicker(defaultOptions());
        const trigger = container.querySelector(
            ".orientationpicker-trigger"
        ) as HTMLElement;
        const event = new KeyboardEvent("keydown", {
            key: "ArrowDown", bubbles: true,
        });
        trigger.dispatchEvent(event);

        const root = container.querySelector(".orientationpicker");
        expect(root?.classList.contains("orientationpicker--open")).toBe(true);
        picker.destroy();
    });

    test("Enter_OnTrigger_OpensPanel", () =>
    {
        const picker = createOrientationPicker(defaultOptions());
        const trigger = container.querySelector(
            ".orientationpicker-trigger"
        ) as HTMLElement;
        const event = new KeyboardEvent("keydown", {
            key: "Enter", bubbles: true,
        });
        trigger.dispatchEvent(event);

        const root = container.querySelector(".orientationpicker");
        expect(root?.classList.contains("orientationpicker--open")).toBe(true);
        picker.destroy();
    });
});

// ============================================================================
// getElement
// ============================================================================

describe("getElement", () =>
{
    test("getElement_ReturnsHTMLElement", () =>
    {
        const picker = createOrientationPicker(defaultOptions());
        expect(picker.getElement()).toBeInstanceOf(HTMLElement);
        picker.destroy();
    });

    test("getElement_HasCorrectRootClass", () =>
    {
        const picker = createOrientationPicker(defaultOptions());
        expect(
            picker.getElement().classList.contains("orientationpicker")
        ).toBe(true);
        picker.destroy();
    });
});
