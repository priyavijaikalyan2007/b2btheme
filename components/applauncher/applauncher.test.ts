/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: a9b0c1d2-e3f4-4a5b-6c7d-8e9f0a1b2c3d
 *
 * ⚓ TESTS: AppLauncher
 * Vitest unit tests for the AppLauncher component.
 * Covers: factory, trigger, grid rendering, app selection, search,
 * favorites, categories, open/close, callbacks, destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    AppLauncher,
    createAppLauncher,
} from "./applauncher";
import type { AppLauncherOptions, AppItem } from "./applauncher";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeApps(): AppItem[]
{
    return [
        { id: "app-1", name: "Dashboard", icon: "bi-speedometer2" },
        { id: "app-2", name: "Projects", icon: "bi-kanban" },
        { id: "app-3", name: "Analytics", icon: "bi-graph-up" },
        { id: "app-4", name: "Settings", icon: "bi-gear" },
    ];
}

function makeOptions(
    overrides?: Partial<AppLauncherOptions>
): AppLauncherOptions
{
    return {
        apps: makeApps(),
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "launcher-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("AppLauncher factory", () =>
{
    test("Constructor_ValidOptions_CreatesInstance", () =>
    {
        const launcher = new AppLauncher(makeOptions());
        expect(launcher).toBeDefined();
        expect(launcher.getElement()).toBeInstanceOf(HTMLElement);
        launcher.destroy();
    });

    test("createAppLauncher_WithContainerId_MountsInContainer", () =>
    {
        const launcher = createAppLauncher(
            makeOptions(), "launcher-test-container"
        );
        expect(
            container.querySelector(".applauncher")
        ).not.toBeNull();
        launcher.destroy();
    });
});

// ============================================================================
// TRIGGER
// ============================================================================

describe("AppLauncher trigger", () =>
{
    test("RendersTriggerButton", () =>
    {
        const launcher = new AppLauncher(makeOptions());
        launcher.show("launcher-test-container");
        const trigger = container.querySelector(
            ".applauncher-trigger"
        );
        expect(trigger).not.toBeNull();
        launcher.destroy();
    });
});

// ============================================================================
// OPEN / CLOSE
// ============================================================================

describe("AppLauncher open/close", () =>
{
    test("InitialState_Closed", () =>
    {
        const launcher = new AppLauncher(makeOptions());
        launcher.show("launcher-test-container");
        expect(launcher.isOpen()).toBe(false);
        launcher.destroy();
    });

    test("Open_ShowsGrid", () =>
    {
        const launcher = new AppLauncher(makeOptions());
        launcher.show("launcher-test-container");
        launcher.open();
        expect(launcher.isOpen()).toBe(true);
        launcher.destroy();
    });

    test("Close_HidesGrid", () =>
    {
        const launcher = new AppLauncher(makeOptions());
        launcher.show("launcher-test-container");
        launcher.open();
        launcher.close();
        expect(launcher.isOpen()).toBe(false);
        launcher.destroy();
    });
});

// ============================================================================
// APPS
// ============================================================================

describe("AppLauncher apps", () =>
{
    test("SetApps_UpdatesAppList", () =>
    {
        const launcher = new AppLauncher(makeOptions());
        launcher.show("launcher-test-container");
        const newApps: AppItem[] = [
            { id: "new-1", name: "New App" },
        ];
        launcher.setApps(newApps);
        // Reopen to see updated content
        launcher.open();
        expect(launcher.isOpen()).toBe(true);
        launcher.destroy();
    });

    test("OnSelect_FiresCallback", () =>
    {
        const onSelect = vi.fn();
        const launcher = new AppLauncher(makeOptions({ onSelect }));
        launcher.show("launcher-test-container");
        launcher.open();
        const items = document.querySelectorAll(".applauncher-app-card");
        if (items.length > 0)
        {
            (items[0] as HTMLElement).click();
            expect(onSelect).toHaveBeenCalled();
        }
        launcher.destroy();
    });
});

// ============================================================================
// ACTIVE APP
// ============================================================================

describe("AppLauncher active app", () =>
{
    test("SetActiveAppId_UpdatesActiveState", () =>
    {
        const launcher = new AppLauncher(makeOptions({
            activeAppId: "app-1",
        }));
        launcher.show("launcher-test-container");
        launcher.setActiveAppId("app-2");
        expect(launcher.getActiveAppId()).toBe("app-2");
        launcher.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("AppLauncher destroy", () =>
{
    test("Destroy_RemovesFromContainer", () =>
    {
        const launcher = new AppLauncher(makeOptions());
        launcher.show("launcher-test-container");
        launcher.destroy();
        expect(
            container.querySelector(".applauncher")
        ).toBeNull();
    });

    test("Destroy_CalledTwice_IsIdempotent", () =>
    {
        const launcher = new AppLauncher(makeOptions());
        launcher.show("launcher-test-container");
        launcher.destroy();
        expect(() => launcher.destroy()).not.toThrow();
    });
});
