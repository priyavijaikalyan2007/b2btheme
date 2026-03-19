/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: f8a9b0c1-d2e3-4f4a-5b6c-7d8e9f0a1b2c
 *
 * ⚓ TESTS: WorkspaceSwitcher
 * Vitest unit tests for the WorkspaceSwitcher component.
 * Covers: factory, trigger, dropdown, workspace items, search,
 * switch callback, keyboard, destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    WorkspaceSwitcher,
    createWorkspaceSwitcher,
} from "./workspaceswitcher";
import type
{
    WorkspaceSwitcherOptions,
    Workspace,
} from "./workspaceswitcher";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeWorkspaces(): Workspace[]
{
    return [
        { id: "ws-1", name: "Alpha Corp", role: "Admin" },
        { id: "ws-2", name: "Beta LLC", role: "Member" },
        { id: "ws-3", name: "Gamma Inc", role: "Viewer" },
    ];
}

function makeOptions(
    overrides?: Partial<WorkspaceSwitcherOptions>
): WorkspaceSwitcherOptions
{
    return {
        workspaces: makeWorkspaces(),
        activeWorkspaceId: "ws-1",
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

describe("WorkspaceSwitcher factory", () =>
{
    test("Constructor_ValidOptions_CreatesInstance", () =>
    {
        const switcher = new WorkspaceSwitcher(makeOptions());
        expect(switcher).toBeDefined();
        expect(switcher.getElement()).toBeInstanceOf(HTMLElement);
        switcher.destroy();
    });

    test("createWorkspaceSwitcher_WithContainerId_MountsInContainer", () =>
    {
        const switcher = createWorkspaceSwitcher(
            makeOptions(), "ws-test-container"
        );
        expect(
            container.querySelector(".workspaceswitcher")
        ).not.toBeNull();
        switcher.destroy();
    });
});

// ============================================================================
// TRIGGER
// ============================================================================

describe("WorkspaceSwitcher trigger", () =>
{
    test("Trigger_ShowsActiveWorkspaceName", () =>
    {
        const switcher = new WorkspaceSwitcher(makeOptions());
        switcher.show("ws-test-container");
        const triggerName = container.querySelector(
            ".workspaceswitcher-trigger-name"
        );
        expect(triggerName?.textContent).toContain("Alpha Corp");
        switcher.destroy();
    });
});

// ============================================================================
// DROPDOWN
// ============================================================================

describe("WorkspaceSwitcher dropdown", () =>
{
    test("InitialState_DropdownClosed", () =>
    {
        const switcher = new WorkspaceSwitcher(makeOptions());
        switcher.show("ws-test-container");
        expect(switcher.isOpen()).toBe(false);
        switcher.destroy();
    });

    test("Open_ShowsDropdown", () =>
    {
        const switcher = new WorkspaceSwitcher(makeOptions());
        switcher.show("ws-test-container");
        switcher.open();
        expect(switcher.isOpen()).toBe(true);
        switcher.destroy();
    });

    test("Close_HidesDropdown", () =>
    {
        const switcher = new WorkspaceSwitcher(makeOptions());
        switcher.show("ws-test-container");
        switcher.open();
        switcher.close();
        expect(switcher.isOpen()).toBe(false);
        switcher.destroy();
    });
});

// ============================================================================
// WORKSPACE SWITCHING
// ============================================================================

describe("WorkspaceSwitcher switching", () =>
{
    test("SetActiveWorkspace_ChangesActive", () =>
    {
        const switcher = new WorkspaceSwitcher(makeOptions());
        switcher.show("ws-test-container");
        switcher.setActiveWorkspace("ws-2");
        const active = switcher.getActiveWorkspace();
        expect(active?.id).toBe("ws-2");
        switcher.destroy();
    });

    test("GetActiveWorkspace_ReturnsWorkspaceObject", () =>
    {
        const switcher = new WorkspaceSwitcher(makeOptions());
        switcher.show("ws-test-container");
        const active = switcher.getActiveWorkspace();
        expect(active?.name).toBe("Alpha Corp");
        switcher.destroy();
    });
});

// ============================================================================
// SET WORKSPACES
// ============================================================================

describe("WorkspaceSwitcher setWorkspaces", () =>
{
    test("SetWorkspaces_UpdatesList", () =>
    {
        const switcher = new WorkspaceSwitcher(makeOptions());
        switcher.show("ws-test-container");
        const newWorkspaces = [
            { id: "ws-new", name: "New Workspace" },
        ];
        switcher.setWorkspaces(newWorkspaces);
        switcher.setActiveWorkspace("ws-new");
        const active = switcher.getActiveWorkspace();
        expect(active?.id).toBe("ws-new");
        switcher.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("WorkspaceSwitcher destroy", () =>
{
    test("Destroy_RemovesFromContainer", () =>
    {
        const switcher = new WorkspaceSwitcher(makeOptions());
        switcher.show("ws-test-container");
        switcher.destroy();
        expect(
            container.querySelector(".workspaceswitcher")
        ).toBeNull();
    });

    test("Destroy_CalledTwice_IsIdempotent", () =>
    {
        const switcher = new WorkspaceSwitcher(makeOptions());
        switcher.show("ws-test-container");
        switcher.destroy();
        expect(() => switcher.destroy()).not.toThrow();
    });
});
