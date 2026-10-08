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
        switcher.destroy();
        expect(() => switcher.destroy()).not.toThrow();
    });
});

// ===========================================================================
// ADR-154: the deprecated surface must WORK, not merely exist
// ===========================================================================

describe("deprecatedWorkspaceNames", () =>
{
    let host: HTMLElement;

    beforeEach(() =>
    {
        host = document.createElement("div");
        host.id = "tenantswitcher-compat-host";
        document.body.appendChild(host);
    });

    afterEach(() =>
    {
        host.remove();
    });

    const legacyTenants = [
        { id: "t1", name: "Acme" },
        { id: "t2", name: "Globex" },
    ];

    test("CreateWorkspaceSwitcher_OldOptionNames_Mounts", () =>
    {
        // The apps team passes `workspaces` / `activeWorkspaceId` today. They
        // must keep working for one release — a global that silently becomes
        // undefined renders nothing and reports nothing, which is the failure
        // mode this overlap exists to prevent.
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        const switcher = createWorkspaceSwitcher(
            {
                workspaces: legacyTenants,
                activeWorkspaceId: "t1",
            },
            "tenantswitcher-compat-host"
        );

        expect(switcher).toBeInstanceOf(TenantSwitcher);
        expect(host.children.length).toBeGreaterThan(0);
        expect(switcher.getActiveTenant()?.id).toBe("t1");

        switcher.destroy();
        warn.mockRestore();
    });

    test("CreateWorkspaceSwitcher_WarnsItIsDeprecated", () =>
    {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        const switcher = createWorkspaceSwitcher(
            { workspaces: legacyTenants, activeWorkspaceId: "t1" },
            "tenantswitcher-compat-host"
        );

        const said = warn.mock.calls
            .some((c) => c.join(" ").toLowerCase().includes("deprecated"));

        expect(said).toBe(true);

        switcher.destroy();
        warn.mockRestore();
    });

    test("LegacyMethodNames_ForwardToTheirReplacements", () =>
    {
        // The method names and the script tag should be movable in separate
        // changes, which is the point of overlapping a release.
        const switcher = createTenantSwitcher(
            { tenants: legacyTenants, activeTenantId: "t1" },
            "tenantswitcher-compat-host"
        );

        switcher.setWorkspaces([{ id: "t3", name: "Initech" }]);
        switcher.setActiveWorkspace("t3");

        expect(switcher.getActiveWorkspace()?.id).toBe("t3");
        expect(switcher.getActiveTenant()?.id).toBe("t3");

        switcher.addWorkspace({ id: "t4", name: "Umbrella" });
        switcher.setActiveTenant("t4");

        expect(switcher.getActiveWorkspace()?.name).toBe("Umbrella");

        switcher.destroy();
    });

    test("NewOptionNames_StillPreferredWhenBothGiven", () =>
    {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        const switcher = createWorkspaceSwitcher(
            {
                tenants: legacyTenants,
                activeTenantId: "t2",
                workspaces: [{ id: "zz", name: "Ignored" }],
                activeWorkspaceId: "zz",
            } as never,
            "tenantswitcher-compat-host"
        );

        expect(switcher.getActiveTenant()?.id).toBe("t2");

        switcher.destroy();
        warn.mockRestore();
    });
});
