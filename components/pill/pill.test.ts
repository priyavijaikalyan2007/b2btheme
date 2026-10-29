/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: c5d6e7f8-a9b0-4c1d-2e3f-4a5b6c7d8e9f
 *
 * ⚓ TESTS: Pill
 * Vitest unit tests for the Pill component.
 * Covers: factory, label, colors, sizes, dismissible, clickable,
 * setLabel, setColor, destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    Pill,
    createPill,
} from "./pill";
import type { PillOptions } from "./pill";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeOptions(
    overrides?: Partial<PillOptions>
): PillOptions
{
    return {
        label: "Test Pill",
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "pill-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("Pill factory", () =>
{
    test("Constructor_ValidOptions_CreatesInstance", () =>
    {
        const pill = new Pill(makeOptions());
        expect(pill).toBeDefined();
        expect(pill.getElement()).toBeInstanceOf(HTMLElement);
        pill.destroy();
    });

    test("createPill_ReturnsPillInstance", () =>
    {
        const pill = createPill(makeOptions());
        expect(pill).toBeInstanceOf(Pill);
        pill.destroy();
    });
});

// ============================================================================
// LABEL
// ============================================================================

describe("Pill label", () =>
{
    test("Label_RendersCorrectText", () =>
    {
        const pill = new Pill(makeOptions({ label: "My Tag" }));
        const labelEl = pill.getElement().querySelector(".pill-label");
        expect(labelEl?.textContent).toBe("My Tag");
        pill.destroy();
    });

    test("SetLabel_UpdatesText", () =>
    {
        const pill = new Pill(makeOptions());
        pill.setLabel("Updated");
        const labelEl = pill.getElement().querySelector(".pill-label");
        expect(labelEl?.textContent).toBe("Updated");
        pill.destroy();
    });
});

// ============================================================================
// COLORS
// ============================================================================

describe("Pill colors", () =>
{
    test("BlueColor_HasBlueClass", () =>
    {
        const pill = new Pill(makeOptions({ color: "blue" }));
        expect(pill.getElement().classList.contains("pill-blue")).toBe(true);
        pill.destroy();
    });

    test("GreenColor_HasGreenClass", () =>
    {
        const pill = new Pill(makeOptions({ color: "green" }));
        expect(pill.getElement().classList.contains("pill-green")).toBe(true);
        pill.destroy();
    });

    test("SetColor_ChangesColorClass", () =>
    {
        const pill = new Pill(makeOptions({ color: "blue" }));
        pill.setColor("red");
        expect(pill.getElement().classList.contains("pill-red")).toBe(true);
        expect(pill.getElement().classList.contains("pill-blue")).toBe(false);
        pill.destroy();
    });
});

// ============================================================================
// SIZES
// ============================================================================

describe("Pill sizes", () =>
{
    test("SmallSize_HasSmClass", () =>
    {
        const pill = new Pill(makeOptions({ size: "sm" }));
        expect(pill.getElement().classList.contains("pill-sm")).toBe(true);
        pill.destroy();
    });
});

// ============================================================================
// DISMISSIBLE
// ============================================================================

describe("Pill dismissible", () =>
{
    test("Dismissible_HasCloseButton", () =>
    {
        const pill = new Pill(makeOptions({ dismissible: true }));
        const closeBtn = pill.getElement().querySelector(".pill-dismiss");
        expect(closeBtn).not.toBeNull();
        pill.destroy();
    });

    test("NotDismissible_NoCloseButton", () =>
    {
        const pill = new Pill(makeOptions({ dismissible: false }));
        const closeBtn = pill.getElement().querySelector(".pill-dismiss");
        expect(closeBtn).toBeNull();
        pill.destroy();
    });

    test("OnDismiss_FiresCallback", () =>
    {
        const onDismiss = vi.fn();
        const pill = new Pill(makeOptions({ dismissible: true, onDismiss }));
        const closeBtn = pill.getElement().querySelector(".pill-dismiss") as HTMLElement;
        closeBtn?.click();
        expect(onDismiss).toHaveBeenCalled();
        pill.destroy();
    });
});

// ============================================================================
// CLICKABLE
// ============================================================================

describe("Pill clickable", () =>
{
    test("Clickable_HasTabindex", () =>
    {
        const pill = new Pill(makeOptions({ clickable: true }));
        expect(pill.getElement().getAttribute("tabindex")).toBe("0");
        pill.destroy();
    });

    test("OnClick_FiresCallback", () =>
    {
        const onClick = vi.fn();
        const pill = new Pill(makeOptions({ clickable: true, onClick }));
        pill.getElement().click();
        expect(onClick).toHaveBeenCalled();
        pill.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("Pill destroy", () =>
{
    test("Destroy_CleanUpHandlers", () =>
    {
        // DEBT-TEST-1b. The name claims the handlers are cleaned up and
        // the body only claimed destroy() survived. The spy was already
        // in the options and nothing ever looked at it (ADR-215).
        const onClick = vi.fn();
        const pill = new Pill(makeOptions({ clickable: true, onClick }));
        const el = pill.getElement();

        el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        expect(onClick).toHaveBeenCalledTimes(1);

        pill.destroy();
        el.dispatchEvent(new MouseEvent("click", { bubbles: true }));

        expect(onClick).toHaveBeenCalledTimes(1);
    });
});

// ============================================================================
// SURFACE CONTRACT (B4): additive on("click" | "dismiss"), getState/setState
// and setData. Legacy callbacks keep firing first, exactly once.
// ============================================================================

describe("surface contract (B4)", () =>
{
    test("on(click)_ClickableActivation_HearsLabelAfterOnClick", () =>
    {
        const order: string[] = [];
        const pill = createPill(makeOptions({ clickable: true, onClick: () => order.push("option") }));
        pill.on("click", (label) => order.push(`channel:${String(label)}`));
        const el = pill.getElement();

        el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        el.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));

        expect(order).toEqual([
            "option", "channel:Test Pill",
            "option", "channel:Test Pill",
            "option", "channel:Test Pill",
        ]);
        pill.destroy();
    });

    test("on(click)_WithoutOnClick_StillEmitsCurrentLabel", () =>
    {
        const heard = vi.fn();
        const pill = createPill(makeOptions({ clickable: true }));
        pill.on("click", heard);

        pill.setLabel("Renamed");
        pill.getElement().dispatchEvent(new MouseEvent("click", { bubbles: true }));

        expect(heard).toHaveBeenCalledTimes(1);
        expect(heard).toHaveBeenCalledWith("Renamed");
        pill.destroy();
    });

    test("on(dismiss)_DismissButton_HearsLabelAfterOnDismissAndBeforeRemoval", () =>
    {
        const order: string[] = [];
        const pill = createPill(makeOptions({
            dismissible: true,
            onDismiss: () => order.push(`option:attached=${String(el.isConnected)}`),
        }));
        const el = pill.getElement();
        container.appendChild(el);
        pill.on("dismiss", (label) => order.push(`channel:${String(label)}:attached=${String(el.isConnected)}`));

        el.querySelector<HTMLElement>(".pill-dismiss")!.click();

        expect(order).toEqual(["option:attached=true", "channel:Test Pill:attached=true"]);
        expect(el.isConnected).toBe(false);
    });

    test("on(dismiss)_WithoutOnDismiss_StillEmitsAndRemoves", () =>
    {
        const heard = vi.fn();
        const pill = createPill(makeOptions({ dismissible: true }));
        const el = pill.getElement();
        container.appendChild(el);
        pill.on("dismiss", heard);

        el.querySelector<HTMLElement>(".pill-dismiss")!.click();

        expect(heard).toHaveBeenCalledTimes(1);
        expect(heard).toHaveBeenCalledWith("Test Pill");
        expect(el.isConnected).toBe(false);
    });

    test("on_Unsubscribe_StopsDelivery", () =>
    {
        const heard = vi.fn();
        const pill = createPill(makeOptions({ clickable: true }));
        const off = pill.on("click", heard);
        const el = pill.getElement();

        el.click();
        off();
        el.click();

        expect(heard).toHaveBeenCalledTimes(1);
        pill.destroy();
    });

    test("on_Destroy_ClearsHandlers", () =>
    {
        const heard = vi.fn();
        const pill = createPill(makeOptions({ clickable: true }));
        pill.on("click", heard);
        const el = pill.getElement();

        pill.destroy();
        el.click();

        expect(heard).not.toHaveBeenCalled();
    });

    test("on_ThrowingHandler_DoesNotBlockLaterHandlers", () =>
    {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const later = vi.fn();
        const pill = createPill(makeOptions({ clickable: true }));
        pill.on("click", () => { throw new Error("boom"); });
        pill.on("click", later);

        pill.getElement().click();

        expect(later).toHaveBeenCalledWith("Test Pill");
        errorSpy.mockRestore();
        pill.destroy();
    });

    test("on_UnknownChannel_Throws", () =>
    {
        const pill = createPill(makeOptions());

        expect(() => pill.on("bogus", () => undefined)).toThrow('"click", "dismiss"');
        expect(() => pill.on("hover", () => undefined)).toThrow("Pill");
        pill.destroy();
    });

    test("setData_AnySlot_Throws", () =>
    {
        const pill = createPill(makeOptions());

        expect(() => pill.setData("label", "x")).toThrow("no data slots");
        expect(() => pill.setData("label", "x")).toThrow("setLabel");
        pill.destroy();
    });

    test("getState_SetState_HaveNoStateKeys", () =>
    {
        const pill = createPill(makeOptions());

        expect(pill.getState()).toEqual({});
        pill.setState({ label: "ignored" });
        expect(pill.getState()).toEqual({});
        expect(pill.getElement().textContent).toBe("Test Pill");
        pill.destroy();
    });

    test("on_Payloads_AreJsonRoundTrippable", () =>
    {
        const payloads: unknown[] = [];
        const pill = createPill(makeOptions({ clickable: true, dismissible: true }));
        pill.on("click", (p) => payloads.push(p));
        pill.on("dismiss", (p) => payloads.push(p));

        pill.getElement().click();
        pill.getElement().querySelector<HTMLElement>(".pill-dismiss")!.click();

        expect(payloads).toEqual(["Test Pill", "Test Pill"]);
        expect(JSON.parse(JSON.stringify(payloads))).toEqual(payloads);
    });
});
