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
import { destroyProbe } from "../../tests/destroy-probe";
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

    // THE ONLY ASSERTION IN THIS BLOCK WAS BEHIND A GUARD THAT NEVER
    // OPENED, AND THE BLOCK WAS INVISIBLE TO BOTH CEILINGS. It
    // queried `.applauncher-app-card`, a class this component has
    // never written -- the tiles carry `applauncher-tile` -- so the
    // NodeList was empty, nothing was clicked and nothing was
    // asserted. `testsWithoutAssertion` counts the text `expect(`
    // and found one; `testsThatCannotFail` read
    // `toHaveBeenCalled()` and called the block honest. A repo-wide
    // guard probe found it: a must-fail assertion placed inside each
    // of 72 guarded bodies, and this was one of two that stayed
    // green. ADR-216.
    test("OnSelect_FiresCallback", () =>
    {
        const onSelect = vi.fn();
        const launcher = new AppLauncher(makeOptions({ onSelect }));
        launcher.show("launcher-test-container");
        launcher.open();

        const tiles = document.querySelectorAll(".applauncher-tile");

        // Unguarded on purpose. An empty NodeList is the defect this
        // block was hiding, so it has to be the thing that fails.
        expect(tiles).toHaveLength(4);
        (tiles[1] as HTMLElement).click();

        // The handler is handed the APP, and naming which one is what
        // separates "a click fired something" from "a click fired the
        // tile the reader is looking at".
        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect.mock.calls[0][0]).toMatchObject({
            id: "app-2",
            name: "Projects",
        });

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
        const probe = destroyProbe();

        launcher.destroy();
        const first = probe.total();
        launcher.destroy();

        expect(first).toBeGreaterThan(0);
        expect(probe.total()).toBe(first);
        probe.restore();
    });
});
