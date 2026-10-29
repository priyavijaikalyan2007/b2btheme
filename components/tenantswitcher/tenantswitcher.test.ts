/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: f8a9b0c1-d2e3-4f4a-5b6c-7d8e9f0a1b2c
 *
 * ⚓ TESTS: TenantSwitcher
 * Vitest unit tests for the TenantSwitcher component.
 * Covers: factory, trigger, dropdown, tenant items, search,
 * switch callback, keyboard, destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { destroyProbe } from "../../tests/destroy-probe";
import
{
    TenantSwitcher,
    createTenantSwitcher,
    createWorkspaceSwitcher,
} from "./tenantswitcher";
import type
{
    TenantSwitcherOptions,
    Tenant,
} from "./tenantswitcher";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeTenants(): Tenant[]
{
    return [
        { id: "ws-1", name: "Alpha Corp", role: "Admin" },
        { id: "ws-2", name: "Beta LLC", role: "Member" },
        { id: "ws-3", name: "Gamma Inc", role: "Viewer" },
    ];
}

function makeOptions(
    overrides?: Partial<TenantSwitcherOptions>
): TenantSwitcherOptions
{
    return {
        tenants: makeTenants(),
        activeTenantId: "ws-1",
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "ws-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("TenantSwitcher factory", () =>
{
    test("Constructor_ValidOptions_CreatesInstance", () =>
    {
        const switcher = new TenantSwitcher(makeOptions());
        expect(switcher).toBeDefined();
        expect(switcher.getElement()).toBeInstanceOf(HTMLElement);
        switcher.destroy();
    });

    test("createTenantSwitcher_WithContainerId_MountsInContainer", () =>
    {
        const switcher = createTenantSwitcher(
            makeOptions(), "ws-test-container"
        );
        expect(
            container.querySelector(".tenantswitcher")
        ).not.toBeNull();
        switcher.destroy();
    });
});

// ============================================================================
// TRIGGER
// ============================================================================

describe("TenantSwitcher trigger", () =>
{
    test("Trigger_ShowsActiveTenantName", () =>
    {
        const switcher = new TenantSwitcher(makeOptions());
        switcher.show("ws-test-container");
        const triggerName = container.querySelector(
            ".tenantswitcher-trigger-name"
        );
        expect(triggerName?.textContent).toContain("Alpha Corp");
        switcher.destroy();
    });
});

// ============================================================================
// DROPDOWN
// ============================================================================

describe("TenantSwitcher dropdown", () =>
{
    test("InitialState_DropdownClosed", () =>
    {
        const switcher = new TenantSwitcher(makeOptions());
        switcher.show("ws-test-container");
        expect(switcher.isOpen()).toBe(false);
        switcher.destroy();
    });

    test("Open_ShowsDropdown", () =>
    {
        const switcher = new TenantSwitcher(makeOptions());
        switcher.show("ws-test-container");
        switcher.open();
        expect(switcher.isOpen()).toBe(true);
        switcher.destroy();
    });

    test("Close_HidesDropdown", () =>
    {
        const switcher = new TenantSwitcher(makeOptions());
        switcher.show("ws-test-container");
        switcher.open();
        switcher.close();
        expect(switcher.isOpen()).toBe(false);
        switcher.destroy();
    });
});

// ============================================================================
// TENANT SWITCHING
// ============================================================================

describe("TenantSwitcher switching", () =>
{
    test("SetActiveTenant_ChangesActive", () =>
    {
        const switcher = new TenantSwitcher(makeOptions());
        switcher.show("ws-test-container");
        switcher.setActiveTenant("ws-2");
        const active = switcher.getActiveTenant();
        expect(active?.id).toBe("ws-2");
        switcher.destroy();
    });

    test("GetActiveTenant_ReturnsTenantObject", () =>
    {
        const switcher = new TenantSwitcher(makeOptions());
        switcher.show("ws-test-container");
        const active = switcher.getActiveTenant();
        expect(active?.name).toBe("Alpha Corp");
        switcher.destroy();
    });
});

// ============================================================================
// SET TENANTS
// ============================================================================

describe("TenantSwitcher setTenants", () =>
{
    test("SetTenants_UpdatesList", () =>
    {
        const switcher = new TenantSwitcher(makeOptions());
        switcher.show("ws-test-container");
        const newTenants = [
            { id: "ws-new", name: "New Tenant" },
        ];
        switcher.setTenants(newTenants);
        switcher.setActiveTenant("ws-new");
        const active = switcher.getActiveTenant();
        expect(active?.id).toBe("ws-new");
        switcher.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("TenantSwitcher destroy", () =>
{
    test("Destroy_RemovesFromContainer", () =>
    {
        const switcher = new TenantSwitcher(makeOptions());
        switcher.show("ws-test-container");
        switcher.destroy();
        expect(
            container.querySelector(".tenantswitcher")
        ).toBeNull();
    });

    test("Destroy_CalledTwice_IsIdempotent", () =>
    {
        const switcher = new TenantSwitcher(makeOptions());
        switcher.show("ws-test-container");
        const probe = destroyProbe();

        switcher.destroy();
        const first = probe.total();
        switcher.destroy();

        expect(first).toBeGreaterThan(0);
        expect(probe.total()).toBe(first);
        probe.restore();
    });
});

// ===========================================================================
// ADR-154: the deprecated surface must WORK, not merely exist
// ===========================================================================


// ============================================================================
// SURFACE CONTRACT (additive, readiness step 2 B8)
// ============================================================================

describe("surface contract (B8)", () =>
{
    function items(): HTMLElement[]
    {
        return Array.from(document.querySelectorAll<HTMLElement>(".tenantswitcher-item"));
    }

    test("on_Switch_HearsTheTenantWithoutData_AfterOnSwitch_ExactlyOnce", () =>
    {
        const order: unknown[] = [];
        const tenants = makeTenants();
        tenants[1].data = { secret: "host-only" };
        const ts = new TenantSwitcher(makeOptions({ tenants, onSwitch: (t) => order.push(`option:${t.id}`) }));
        ts.on("switch", (p) => order.push(p));

        ts.open();
        items()[1].click();

        expect(order).toEqual(["option:ws-2", { id: "ws-2", name: "Beta LLC", role: "Member" }]);
        ts.destroy();
    });

    test("on_Switch_PickingTheActiveTenant_IsSilent", () =>
    {
        const heard = vi.fn();
        const ts = new TenantSwitcher(makeOptions());
        ts.on("switch", heard);

        ts.open();
        items()[0].click();

        expect(heard).not.toHaveBeenCalled();
        ts.destroy();
    });

    test("on_Create_HearsTheSearchText_AfterOnCreate", () =>
    {
        vi.useFakeTimers();
        const order: unknown[] = [];
        const ts = new TenantSwitcher(makeOptions({ showSearch: true, onCreate: () => order.push("option") }));
        ts.on("create", (p) => order.push(p));

        ts.open();
        const input = document.querySelector<HTMLInputElement>(".tenantswitcher-search-input")!;
        input.value = "  Delta  ";
        document.querySelector<HTMLElement>(".tenantswitcher-create")!.click();

        expect(order).toEqual(["option", "Delta"]);
        ts.destroy();
        vi.useRealTimers();
    });

    test("on_Create_WithoutSearch_HearsAnEmptyString", () =>
    {
        const heard = vi.fn();
        const ts = new TenantSwitcher(makeOptions({ showSearch: false }));
        ts.on("create", heard);

        ts.open();
        document.querySelector<HTMLElement>(".tenantswitcher-create")!.click();

        expect(heard).toHaveBeenCalledWith("");
        ts.destroy();
    });

    test("getState_ReportsTheActiveTenant_AndSetStateRestoresItSilently", () =>
    {
        const onSwitch = vi.fn();
        const heard = vi.fn();
        const ts = new TenantSwitcher(makeOptions({ onSwitch }));
        ts.on("switch", heard);

        ts.setState({ activeTenantId: "ws-3" });

        expect(ts.getState()).toEqual({ activeTenantId: "ws-3" });
        expect(ts.getActiveTenant()?.name).toBe("Gamma Inc");
        expect(onSwitch).not.toHaveBeenCalled();
        expect(heard).not.toHaveBeenCalled();
        ts.destroy();
    });

    test("setState_WithoutTheKey_LeavesTheActiveTenant", () =>
    {
        const ts = new TenantSwitcher(makeOptions());

        ts.setState({});

        expect(ts.getState()).toEqual({ activeTenantId: "ws-1" });
        ts.destroy();
    });

    test("on_UnknownChannel_Throws_AndUnsubscribeStopsDelivery", () =>
    {
        const heard = vi.fn();
        const ts = new TenantSwitcher(makeOptions());
        const off = ts.on("switch", heard);

        off();
        ts.open();
        items()[1].click();

        expect(heard).not.toHaveBeenCalled();
        expect(() => ts.on("open", vi.fn())).toThrow(/"switch" and "create"/);
        ts.destroy();
    });

    test("setData_AnySlot_Throws", () =>
    {
        const ts = new TenantSwitcher(makeOptions());

        expect(() => ts.setData("tenants", [])).toThrow(/no data slots/);
        ts.destroy();
    });
});
