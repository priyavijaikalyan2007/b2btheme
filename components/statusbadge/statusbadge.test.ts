/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c
 *
 * ⚓ TESTS: StatusBadge
 * Vitest unit tests for the StatusBadge component.
 * Covers: factory, status variants, DOM structure, pulse, clickable,
 * setStatus, setLabel, ARIA, show/hide, destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    StatusBadge,
    createStatusBadge,
} from "./statusbadge";
import type { StatusBadgeOptions } from "./statusbadge";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeOptions(
    overrides?: Partial<StatusBadgeOptions>
): StatusBadgeOptions
{
    return {
        status: "operational",
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "status-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("StatusBadge factory", () =>
{
    test("Constructor_ValidOptions_CreatesInstance", () =>
    {
        const badge = new StatusBadge(makeOptions());
        expect(badge).toBeDefined();
        expect(badge.getElement()).toBeInstanceOf(HTMLElement);
        badge.destroy();
    });

    test("createStatusBadge_WithContainerId_MountsInContainer", () =>
    {
        const badge = createStatusBadge(
            "status-test-container", makeOptions()
        );
        expect(
            container.querySelector(".statusbadge")
        ).not.toBeNull();
        badge.destroy();
    });
});

// ============================================================================
// STATUS VARIANTS
// ============================================================================

describe("StatusBadge status variants", () =>
{
    test("Operational_HasOperationalClass", () =>
    {
        const badge = new StatusBadge(makeOptions({ status: "operational" }));
        badge.show("status-test-container");
        expect(
            badge.getElement()?.classList.contains("statusbadge-operational")
        ).toBe(true);
        badge.destroy();
    });

    test("Failed_HasFailedClass", () =>
    {
        const badge = new StatusBadge(makeOptions({ status: "failed" }));
        badge.show("status-test-container");
        expect(
            badge.getElement()?.classList.contains("statusbadge-failed")
        ).toBe(true);
        badge.destroy();
    });

    test("Custom_WithCustomColor_AppliesBackgroundColor", () =>
    {
        const badge = new StatusBadge(makeOptions({
            status: "custom",
            customColor: "#ff0000",
        }));
        badge.show("status-test-container");
        const dot = badge.getElement()?.querySelector(".statusbadge-dot") as HTMLElement;
        expect(dot?.style.backgroundColor).toBe("rgb(255, 0, 0)");
        badge.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("StatusBadge DOM", () =>
{
    test("IndicatorVariant_HasDotAndLabel", () =>
    {
        const badge = new StatusBadge(makeOptions({ variant: "indicator" }));
        badge.show("status-test-container");
        expect(badge.getElement()?.querySelector(".statusbadge-dot")).not.toBeNull();
        expect(badge.getElement()?.querySelector(".statusbadge-label")).not.toBeNull();
        badge.destroy();
    });

    test("DotVariant_HasDotOnly", () =>
    {
        const badge = new StatusBadge(makeOptions({ variant: "dot" }));
        badge.show("status-test-container");
        expect(badge.getElement()?.querySelector(".statusbadge-dot")).not.toBeNull();
        expect(badge.getElement()?.querySelector(".statusbadge-label")).toBeNull();
        badge.destroy();
    });

    test("PillVariant_HasLabelOnly", () =>
    {
        const badge = new StatusBadge(makeOptions({ variant: "pill" }));
        badge.show("status-test-container");
        expect(badge.getElement()?.querySelector(".statusbadge-dot")).toBeNull();
        expect(badge.getElement()?.querySelector(".statusbadge-label")).not.toBeNull();
        badge.destroy();
    });
});

// ============================================================================
// PULSE
// ============================================================================

describe("StatusBadge pulse", () =>
{
    test("Operational_AutoPulses", () =>
    {
        const badge = new StatusBadge(makeOptions({ status: "operational" }));
        badge.show("status-test-container");
        const dot = badge.getElement()?.querySelector(".statusbadge-dot");
        expect(dot?.classList.contains("statusbadge-pulse")).toBe(true);
        badge.destroy();
    });

    test("PulseExplicitlyDisabled_NoPulseClass", () =>
    {
        const badge = new StatusBadge(makeOptions({
            status: "operational",
            pulse: false,
        }));
        badge.show("status-test-container");
        const dot = badge.getElement()?.querySelector(".statusbadge-dot");
        expect(dot?.classList.contains("statusbadge-pulse")).toBe(false);
        badge.destroy();
    });
});

// ============================================================================
// MUTATORS
// ============================================================================

describe("StatusBadge mutators", () =>
{
    test("SetStatus_ChangeToDown_UpdatesClass", () =>
    {
        const badge = new StatusBadge(makeOptions({ status: "operational" }));
        badge.show("status-test-container");
        badge.setStatus("down");
        expect(
            badge.getElement()?.classList.contains("statusbadge-down")
        ).toBe(true);
        expect(
            badge.getElement()?.classList.contains("statusbadge-operational")
        ).toBe(false);
        badge.destroy();
    });

    test("SetLabel_UpdatesLabelText", () =>
    {
        const badge = new StatusBadge(makeOptions({ variant: "indicator" }));
        badge.show("status-test-container");
        badge.setLabel("Custom Label");
        const label = badge.getElement()?.querySelector(".statusbadge-label");
        expect(label?.textContent).toBe("Custom Label");
        badge.destroy();
    });
});

// ============================================================================
// ACCESSIBILITY
// ============================================================================

describe("StatusBadge ARIA", () =>
{
    test("RootElement_HasRoleStatus", () =>
    {
        const badge = new StatusBadge(makeOptions());
        expect(badge.getElement()?.getAttribute("role")).toBe("status");
        badge.destroy();
    });

    test("RootElement_HasAriaLabel", () =>
    {
        const badge = new StatusBadge(makeOptions());
        expect(badge.getElement()?.getAttribute("aria-label")).toContain("Status");
        badge.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("StatusBadge destroy", () =>
{
    test("Destroy_NullifiesElement", () =>
    {
        const badge = new StatusBadge(makeOptions());
        badge.show("status-test-container");
        badge.destroy();
        expect(badge.getElement()).toBeNull();
    });

    test("Destroy_RemovesFromContainer", () =>
    {
        const badge = new StatusBadge(makeOptions());
        badge.show("status-test-container");
        badge.destroy();
        expect(container.querySelector(".statusbadge")).toBeNull();
    });
});

// ============================================================================
// SURFACE CONTRACT (B4)
// ============================================================================

describe("surface contract (B4)", () =>
{
    function pressKey(el: HTMLElement, key: string): void
    {
        el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    }

    test("on(click)_Click_DeliversLabelAfterOnClick", () =>
    {
        const order: string[] = [];
        const badge = new StatusBadge(makeOptions({
            clickable: true,
            label: "Build 42",
            onClick: () => order.push("option"),
        }));
        badge.on("click", (payload) => order.push(`channel:${String(payload)}`));

        badge.getElement()!.click();

        expect(order).toEqual(["option", "channel:Build 42"]);
        badge.destroy();
    });

    test("on(click)_EnterAndSpace_EmitOncePerKeyAfterOnClick", () =>
    {
        const order: string[] = [];
        const badge = new StatusBadge(makeOptions({ clickable: true, onClick: () => order.push("option") }));
        badge.on("click", (payload) => order.push(`channel:${String(payload)}`));
        const el = badge.getElement()!;

        pressKey(el, "Enter");
        pressKey(el, " ");
        pressKey(el, "a");

        expect(order).toEqual(["option", "channel:Operational", "option", "channel:Operational"]);
        badge.destroy();
    });

    test("on(click)_NoOnClick_StillEmits", () =>
    {
        const heard = vi.fn();
        const badge = new StatusBadge(makeOptions({ clickable: true }));
        badge.on("click", heard);

        badge.getElement()!.click();

        expect(heard).toHaveBeenCalledTimes(1);
        expect(heard).toHaveBeenCalledWith("Operational");
        badge.destroy();
    });

    test("on(click)_NotClickable_NeverEmits", () =>
    {
        const heard = vi.fn();
        const badge = new StatusBadge(makeOptions());
        badge.on("click", heard);

        badge.getElement()!.click();
        pressKey(badge.getElement()!, "Enter");

        expect(heard).not.toHaveBeenCalled();
        badge.destroy();
    });

    test("on(click)_ReflectsCurrentLabel_AfterSetLabelAndSetStatus", () =>
    {
        const heard = vi.fn();
        const badge = new StatusBadge(makeOptions({ clickable: true }));
        badge.on("click", heard);

        badge.setStatus("down");
        badge.getElement()!.click();
        badge.setLabel("Paged");
        badge.getElement()!.click();

        expect(heard.mock.calls).toEqual([["Down"], ["Paged"]]);
        badge.destroy();
    });

    test("on(click)_OnClickThrows_ChannelStillFires", () =>
    {
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const heard = vi.fn();
        const badge = new StatusBadge(makeOptions({
            clickable: true,
            onClick: () => { throw new Error("boom"); },
        }));
        badge.on("click", heard);

        badge.getElement()!.click();

        expect(heard).toHaveBeenCalledTimes(1);
        errSpy.mockRestore();
        badge.destroy();
    });

    test("on(click)_HandlerThrows_OtherHandlersStillFire", () =>
    {
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const heard = vi.fn();
        const badge = new StatusBadge(makeOptions({ clickable: true }));
        badge.on("click", () => { throw new Error("boom"); });
        badge.on("click", heard);

        badge.getElement()!.click();

        expect(heard).toHaveBeenCalledTimes(1);
        errSpy.mockRestore();
        badge.destroy();
    });

    test("on(click)_Unsubscribe_StopsDelivery", () =>
    {
        const heard = vi.fn();
        const badge = new StatusBadge(makeOptions({ clickable: true }));
        const off = badge.on("click", heard);

        badge.getElement()!.click();
        off();
        badge.getElement()!.click();

        expect(heard).toHaveBeenCalledTimes(1);
        badge.destroy();
    });

    test("on(click)_Payload_IsPlainJson", () =>
    {
        const heard = vi.fn();
        const badge = new StatusBadge(makeOptions({ clickable: true, label: "Build 42" }));
        badge.on("click", heard);

        badge.getElement()!.click();

        const payload = heard.mock.calls[0][0];
        expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
        expect(typeof payload).toBe("string");
        badge.destroy();
    });

    test("destroy_ClearsHandlers", () =>
    {
        const heard = vi.fn();
        const badge = new StatusBadge(makeOptions({ clickable: true }));
        badge.on("click", heard);
        const el = badge.getElement()!;

        badge.destroy();
        el.click();
        pressKey(el, "Enter");

        expect(heard).not.toHaveBeenCalled();
    });

    test("on_UnknownChannel_Throws", () =>
    {
        const badge = new StatusBadge(makeOptions());

        expect(() => badge.on("bogus", () => undefined)).toThrow('"click"');
        badge.destroy();
    });

    test("setData_Throws", () =>
    {
        const badge = new StatusBadge(makeOptions());

        expect(() => badge.setData("label", "x")).toThrow("no data slots");
        expect(() => badge.setData("label", "x")).toThrow("setLabel()");
        badge.destroy();
    });

    test("getState_SetState_HaveNoStateKeys", () =>
    {
        const badge = new StatusBadge(makeOptions({ label: "Keep" }));

        expect(badge.getState()).toEqual({});
        badge.setState({ label: "Ignored", status: "down" });

        expect(badge.getState()).toEqual({});
        expect(badge.getElement()!.textContent).toBe("Keep");
        badge.destroy();
    });

    test("createStatusBadge_Handle_ExposesSurfaceMethods", () =>
    {
        const heard = vi.fn();
        const handle = createStatusBadge("status-test-container", makeOptions({ clickable: true }));
        handle.on("click", heard);

        container.querySelector<HTMLElement>(".statusbadge")!.click();

        expect(heard).toHaveBeenCalledWith("Operational");
        handle.destroy();
    });
});
