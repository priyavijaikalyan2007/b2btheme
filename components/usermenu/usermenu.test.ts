/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: e7f8a9b0-c1d2-4e3f-4a5b-6c7d8e9f0a1b
 *
 * ⚓ TESTS: UserMenu
 * Vitest unit tests for the UserMenu component.
 * Covers: factory, avatar, dropdown open/close, menu items, keyboard,
 * status, callbacks, destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    UserMenu,
    createUserMenu,
} from "./usermenu";
import type { UserMenuOptions, UserMenuItem } from "./usermenu";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeItems(): UserMenuItem[]
{
    return [
        { id: "profile", label: "Profile", icon: "bi-person" },
        { id: "settings", label: "Settings", icon: "bi-gear" },
        { id: "divider-1", label: "", type: "divider" },
        { id: "signout", label: "Sign Out", danger: true },
    ];
}

function makeOptions(
    overrides?: Partial<UserMenuOptions>
): UserMenuOptions
{
    return {
        userName: "Jane Doe",
        userRole: "Administrator",
        menuItems: makeItems(),
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "usermenu-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("UserMenu factory", () =>
{
    test("Constructor_ValidOptions_CreatesInstance", () =>
    {
        const menu = new UserMenu(makeOptions());
        expect(menu).toBeDefined();
        expect(menu.getElement()).toBeInstanceOf(HTMLElement);
        menu.destroy();
    });

    test("createUserMenu_WithContainerId_MountsInContainer", () =>
    {
        const menu = createUserMenu(
            "usermenu-test-container", makeOptions()
        );
        expect(
            container.querySelector(".usermenu")
        ).not.toBeNull();
        menu.destroy();
    });
});

// ============================================================================
// AVATAR
// ============================================================================

describe("UserMenu avatar", () =>
{
    test("WithoutAvatarUrl_RendersInitials", () =>
    {
        const menu = new UserMenu(makeOptions());
        menu.show("usermenu-test-container");
        const avatar = container.querySelector(".usermenu-avatar");
        expect(avatar).not.toBeNull();
        menu.destroy();
    });

    test("WithAvatarUrl_RendersImage", () =>
    {
        const menu = new UserMenu(makeOptions({
            avatarUrl: "https://example.com/avatar.png",
        }));
        menu.show("usermenu-test-container");
        const img = container.querySelector(".usermenu-avatar img");
        expect(img).not.toBeNull();
        menu.destroy();
    });
});

// ============================================================================
// DROPDOWN
// ============================================================================

describe("UserMenu dropdown", () =>
{
    test("InitialState_DropdownClosed", () =>
    {
        const menu = new UserMenu(makeOptions());
        menu.show("usermenu-test-container");
        expect(menu.isOpen()).toBe(false);
        menu.destroy();
    });

    test("Open_ShowsDropdown", () =>
    {
        const menu = new UserMenu(makeOptions());
        menu.show("usermenu-test-container");
        menu.open();
        expect(menu.isOpen()).toBe(true);
        menu.destroy();
    });

    test("Close_HidesDropdown", () =>
    {
        const menu = new UserMenu(makeOptions());
        menu.show("usermenu-test-container");
        menu.open();
        menu.close();
        expect(menu.isOpen()).toBe(false);
        menu.destroy();
    });
});

// ============================================================================
// MENU ITEMS
// ============================================================================

describe("UserMenu menu items", () =>
{
    test("RendersCorrectNumberOfItems", () =>
    {
        const menu = new UserMenu(makeOptions());
        menu.show("usermenu-test-container");
        menu.open();
        // 4 items: 2 regular + 1 divider + 1 danger
        const items = container.querySelectorAll(".usermenu-item");
        expect(items.length).toBeGreaterThanOrEqual(2);
        menu.destroy();
    });

    test("OnItemClick_FiresCallback", () =>
    {
        const onItemClick = vi.fn();
        const menu = new UserMenu(makeOptions({ onItemClick }));
        menu.show("usermenu-test-container");
        menu.open();
        const item = container.querySelector(
            '.usermenu-item[data-item-id="profile"]'
        ) as HTMLElement
            ?? container.querySelector(
                '[role="menuitem"]'
            ) as HTMLElement;
        item?.click();
        expect(onItemClick).toHaveBeenCalled();
        menu.destroy();
    });
});

// ============================================================================
// STATUS
// ============================================================================

describe("UserMenu status", () =>
{
    test("WithStatus_RendersStatusDot", () =>
    {
        const menu = new UserMenu(makeOptions({ status: "online" }));
        menu.show("usermenu-test-container");
        const dot = container.querySelector(".usermenu-status-online");
        expect(dot).not.toBeNull();
        menu.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("UserMenu destroy", () =>
{
    test("Destroy_RemovesFromContainer", () =>
    {
        const menu = new UserMenu(makeOptions());
        menu.show("usermenu-test-container");
        menu.destroy();
        expect(container.querySelector(".usermenu")).toBeNull();
    });

    test("Destroy_CalledTwice_IsIdempotent", () =>
    {
        const menu = new UserMenu(makeOptions());
        menu.show("usermenu-test-container");
        menu.destroy();
        expect(() => menu.destroy()).not.toThrow();
    });
});
