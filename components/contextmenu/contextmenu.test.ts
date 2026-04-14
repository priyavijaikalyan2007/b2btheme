/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: ContextMenu
 * Spec-based tests for the ContextMenu component.
 * Tests cover: creation, positioning, item rendering, keyboard navigation,
 * sub-menus, close behaviours, checked states, disabled states, danger styling,
 * separator rendering, header rendering, viewport edge detection, destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
    createContextMenu,
    ContextMenuOptions,
    ContextMenuItem,
} from "./contextmenu";

// ============================================================================
// HELPERS
// ============================================================================

function getMenu(): HTMLElement | null
{
    return document.querySelector(".contextmenu:not(.contextmenu-submenu)");
}

function getMenuItems(): HTMLElement[]
{
    const menu = getMenu();

    if (!menu)
    {
        return [];
    }

    return Array.from(menu.querySelectorAll<HTMLElement>(".contextmenu-item"));
}

function getSeparators(): HTMLElement[]
{
    const menu = getMenu();

    if (!menu)
    {
        return [];
    }

    return Array.from(
        menu.querySelectorAll<HTMLElement>(".contextmenu-separator")
    );
}

function getHeaders(): HTMLElement[]
{
    const menu = getMenu();

    if (!menu)
    {
        return [];
    }

    return Array.from(
        menu.querySelectorAll<HTMLElement>(".contextmenu-header")
    );
}

function getSubmenu(): HTMLElement | null
{
    return document.querySelector(".contextmenu-submenu");
}

function baseOptions(
    overrides?: Partial<ContextMenuOptions>): ContextMenuOptions
{
    return {
        items: [
            { id: "cut", label: "Cut", shortcut: "Ctrl+X" },
            { id: "copy", label: "Copy", shortcut: "Ctrl+C" },
            { id: "paste", label: "Paste", shortcut: "Ctrl+V" },
        ],
        x: 100,
        y: 100,
        ...overrides,
    };
}

function pressKey(key: string): void
{
    document.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true })
    );
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

let currentMenu: ReturnType<typeof createContextMenu> | null = null;

beforeEach(() =>
{
    vi.useFakeTimers();
});

afterEach(() =>
{
    if (currentMenu)
    {
        currentMenu.destroy();
        currentMenu = null;
    }

    // Clean up any stray menus
    document.querySelectorAll(".contextmenu").forEach(el => el.remove());

    vi.useRealTimers();
});

// ============================================================================
// CREATION
// ============================================================================

describe("createContextMenu", () =>
{
    test("creates a menu element in the document", () =>
    {
        currentMenu = createContextMenu(baseOptions());
        expect(getMenu()).not.toBeNull();
    });

    test("returns an object with close, isOpen, updateItems, destroy", () =>
    {
        currentMenu = createContextMenu(baseOptions());

        expect(typeof currentMenu.close).toBe("function");
        expect(typeof currentMenu.isOpen).toBe("function");
        expect(typeof currentMenu.updateItems).toBe("function");
        expect(typeof currentMenu.destroy).toBe("function");
    });

    test("isOpen returns true after creation", () =>
    {
        currentMenu = createContextMenu(baseOptions());
        expect(currentMenu.isOpen()).toBe(true);
    });

    test("menu has role=menu", () =>
    {
        currentMenu = createContextMenu(baseOptions());
        expect(getMenu()?.getAttribute("role")).toBe("menu");
    });
});

// ============================================================================
// ITEM RENDERING
// ============================================================================

describe("item rendering", () =>
{
    test("renders the correct number of items", () =>
    {
        currentMenu = createContextMenu(baseOptions());
        expect(getMenuItems().length).toBe(3);
    });

    test("items have role=menuitem", () =>
    {
        currentMenu = createContextMenu(baseOptions());
        const items = getMenuItems();
        items.forEach(item =>
        {
            expect(item.getAttribute("role")).toBe("menuitem");
        });
    });

    test("displays the label text", () =>
    {
        currentMenu = createContextMenu(baseOptions());
        const labels = getMenuItems().map(
            el => el.querySelector(".contextmenu-label")?.textContent
        );

        expect(labels).toContain("Cut");
        expect(labels).toContain("Copy");
        expect(labels).toContain("Paste");
    });

    test("displays the shortcut text", () =>
    {
        currentMenu = createContextMenu(baseOptions());
        const shortcuts = getMenuItems().map(
            el => el.querySelector(".contextmenu-shortcut")?.textContent
        );

        expect(shortcuts).toContain("Ctrl+X");
        expect(shortcuts).toContain("Ctrl+C");
    });

    test("renders icon when provided", () =>
    {
        currentMenu = createContextMenu(baseOptions({
            items: [{ id: "new", label: "New File", icon: "file-earmark-plus" }],
        }));

        const icon = getMenuItems()[0].querySelector(".bi-file-earmark-plus");
        expect(icon).not.toBeNull();
    });
});

// ============================================================================
// SEPARATOR
// ============================================================================

describe("separator rendering", () =>
{
    test("renders separators with role=separator", () =>
    {
        currentMenu = createContextMenu(baseOptions({
            items: [
                { id: "a", label: "A" },
                { id: "sep", label: "", type: "separator" },
                { id: "b", label: "B" },
            ],
        }));

        const seps = getSeparators();
        expect(seps.length).toBe(1);
        expect(seps[0].getAttribute("role")).toBe("separator");
    });

    test("separators are not focusable items", () =>
    {
        currentMenu = createContextMenu(baseOptions({
            items: [
                { id: "a", label: "A" },
                { id: "sep", label: "", type: "separator" },
                { id: "b", label: "B" },
            ],
        }));

        // Only A and B are menu items; separator is not
        expect(getMenuItems().length).toBe(2);
    });
});

// ============================================================================
// HEADER
// ============================================================================

describe("header rendering", () =>
{
    test("renders header elements with the label text", () =>
    {
        currentMenu = createContextMenu(baseOptions({
            items: [
                { id: "hdr", label: "Actions", type: "header" },
                { id: "a", label: "A" },
            ],
        }));

        const hdrs = getHeaders();
        expect(hdrs.length).toBe(1);
        expect(hdrs[0].textContent).toBe("Actions");
    });

    test("headers are not included in focusable items", () =>
    {
        currentMenu = createContextMenu(baseOptions({
            items: [
                { id: "hdr", label: "Actions", type: "header" },
                { id: "a", label: "A" },
            ],
        }));

        expect(getMenuItems().length).toBe(1);
    });
});

// ============================================================================
// DISABLED ITEMS
// ============================================================================

describe("disabled items", () =>
{
    test("applies disabled class and aria-disabled", () =>
    {
        currentMenu = createContextMenu(baseOptions({
            items: [{ id: "x", label: "Cannot click", disabled: true }],
        }));

        const item = getMenuItems()[0];
        expect(item.classList.contains("contextmenu-item-disabled")).toBe(true);
        expect(item.getAttribute("aria-disabled")).toBe("true");
    });

    test("disabled items do not trigger onClick", () =>
    {
        const handler = vi.fn();

        currentMenu = createContextMenu(baseOptions({
            items: [
                { id: "x", label: "Disabled", disabled: true, onClick: handler },
            ],
        }));

        getMenuItems()[0].click();
        expect(handler).not.toHaveBeenCalled();
    });
});

// ============================================================================
// DANGER ITEMS
// ============================================================================

describe("danger items", () =>
{
    test("applies danger class for destructive items", () =>
    {
        currentMenu = createContextMenu(baseOptions({
            items: [{ id: "del", label: "Delete", danger: true }],
        }));

        const item = getMenuItems()[0];
        expect(item.classList.contains("contextmenu-item-danger")).toBe(true);
    });
});

// ============================================================================
// CHECKED / ACTIVE STATES
// ============================================================================

describe("checked and active states", () =>
{
    test("applies checked class and aria-checked for checked items", () =>
    {
        currentMenu = createContextMenu(baseOptions({
            items: [{ id: "opt", label: "Option", checked: true }],
        }));

        const item = getMenuItems()[0];
        expect(item.classList.contains("contextmenu-item-checked")).toBe(true);
        expect(item.getAttribute("aria-checked")).toBe("true");
    });

    test("renders checkmark icon for checked items", () =>
    {
        currentMenu = createContextMenu(baseOptions({
            items: [{ id: "opt", label: "Option", checked: true }],
        }));

        const check = getMenuItems()[0].querySelector(".bi-check-lg");
        expect(check).not.toBeNull();
    });

    test("applies checked class for active (radio) items", () =>
    {
        currentMenu = createContextMenu(baseOptions({
            items: [{ id: "opt", label: "Option", active: true }],
        }));

        const item = getMenuItems()[0];
        expect(item.classList.contains("contextmenu-item-checked")).toBe(true);
        expect(item.getAttribute("aria-checked")).toBe("true");
    });
});

// ============================================================================
// KEYBOARD NAVIGATION
// ============================================================================

describe("keyboard navigation", () =>
{
    test("ArrowDown moves focus to next item", () =>
    {
        currentMenu = createContextMenu(baseOptions());

        // First item is focused on open
        pressKey("ArrowDown");
        const items = getMenuItems();

        expect(document.activeElement).toBe(items[1]);
    });

    test("ArrowUp moves focus to previous item", () =>
    {
        currentMenu = createContextMenu(baseOptions());

        // First item focused, ArrowUp wraps to last
        pressKey("ArrowUp");
        const items = getMenuItems();

        expect(document.activeElement).toBe(items[items.length - 1]);
    });

    test("Enter clicks the focused item", () =>
    {
        const handler = vi.fn();

        currentMenu = createContextMenu(baseOptions({
            items: [{ id: "a", label: "A", onClick: handler }],
        }));

        pressKey("Enter");
        expect(handler).toHaveBeenCalledTimes(1);
    });

    test("Escape closes the menu", () =>
    {
        currentMenu = createContextMenu(baseOptions());

        pressKey("Escape");
        expect(currentMenu.isOpen()).toBe(false);
        expect(getMenu()).toBeNull();
    });

    test("ArrowDown skips disabled items", () =>
    {
        currentMenu = createContextMenu(baseOptions({
            items: [
                { id: "a", label: "A" },
                { id: "b", label: "B", disabled: true },
                { id: "c", label: "C" },
            ],
        }));

        // Focus is on A, press down — should skip B, land on C
        pressKey("ArrowDown");
        const items = getMenuItems().filter(
            el => !el.classList.contains("contextmenu-item-disabled")
        );

        expect(document.activeElement).toBe(items[1]);
    });
});

// ============================================================================
// SUB-MENUS
// ============================================================================

describe("sub-menus", () =>
{
    test("sub-menu trigger has aria-haspopup=menu", () =>
    {
        currentMenu = createContextMenu(baseOptions({
            items: [
                {
                    id: "more",
                    label: "More",
                    type: "submenu",
                    children: [{ id: "x", label: "X" }],
                },
            ],
        }));

        const trigger = getMenuItems()[0];
        expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    });

    test("sub-menu trigger shows arrow indicator", () =>
    {
        currentMenu = createContextMenu(baseOptions({
            items: [
                {
                    id: "more",
                    label: "More",
                    type: "submenu",
                    children: [{ id: "x", label: "X" }],
                },
            ],
        }));

        const arrow = getMenuItems()[0].querySelector(".contextmenu-arrow");
        expect(arrow).not.toBeNull();
    });

    test("sub-menu opens on hover after delay", () =>
    {
        currentMenu = createContextMenu(baseOptions({
            items: [
                {
                    id: "more",
                    label: "More",
                    type: "submenu",
                    children: [{ id: "x", label: "X" }],
                },
            ],
        }));

        const trigger = getMenuItems()[0];
        trigger.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));

        vi.advanceTimersByTime(250);
        expect(getSubmenu()).not.toBeNull();
    });
});

// ============================================================================
// CLOSE BEHAVIOURS
// ============================================================================

describe("close behaviours", () =>
{
    test("close() removes the menu from DOM", () =>
    {
        currentMenu = createContextMenu(baseOptions());

        currentMenu.close();
        expect(getMenu()).toBeNull();
        expect(currentMenu.isOpen()).toBe(false);
    });

    test("calls onClose callback when closing", () =>
    {
        const onClose = vi.fn();

        currentMenu = createContextMenu(baseOptions({ onClose }));
        currentMenu.close();

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    test("clicking an item closes the menu", () =>
    {
        currentMenu = createContextMenu(baseOptions());

        getMenuItems()[0].click();
        expect(currentMenu.isOpen()).toBe(false);
    });

    test("clicking outside closes the menu", () =>
    {
        currentMenu = createContextMenu(baseOptions());

        // Advance past the setTimeout(0) for outside click listener
        vi.advanceTimersByTime(1);

        document.dispatchEvent(
            new PointerEvent("pointerdown", { bubbles: true })
        );

        expect(currentMenu.isOpen()).toBe(false);
    });

    test("does not close on outside click when autoClose is false", () =>
    {
        currentMenu = createContextMenu(baseOptions({ autoClose: false }));

        vi.advanceTimersByTime(1);

        document.dispatchEvent(
            new MouseEvent("mousedown", { bubbles: true })
        );

        expect(currentMenu.isOpen()).toBe(true);
    });
});

// ============================================================================
// POSITIONING
// ============================================================================

describe("positioning", () =>
{
    test("menu is positioned at the specified x, y", () =>
    {
        currentMenu = createContextMenu(baseOptions({ x: 200, y: 300 }));

        const menu = getMenu();
        expect(menu?.style.left).toBe("200px");
        expect(menu?.style.top).toBe("300px");
    });

    test("menu has fixed positioning", () =>
    {
        currentMenu = createContextMenu(baseOptions());

        const menu = getMenu();
        expect(menu?.style.position).toBe("fixed");
    });
});

// ============================================================================
// UPDATE ITEMS
// ============================================================================

describe("updateItems", () =>
{
    test("replaces menu items with new set", () =>
    {
        currentMenu = createContextMenu(baseOptions());

        expect(getMenuItems().length).toBe(3);

        currentMenu.updateItems([
            { id: "a", label: "Alpha" },
            { id: "b", label: "Beta" },
        ]);

        expect(getMenuItems().length).toBe(2);
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("destroy", () =>
{
    test("removes the menu and marks as closed", () =>
    {
        currentMenu = createContextMenu(baseOptions());

        currentMenu.destroy();
        expect(getMenu()).toBeNull();
        expect(currentMenu.isOpen()).toBe(false);
    });

    test("calling destroy twice does not throw", () =>
    {
        currentMenu = createContextMenu(baseOptions());

        currentMenu.destroy();
        expect(() => currentMenu!.destroy()).not.toThrow();
    });

    test("updateItems after destroy logs warning", () =>
    {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        currentMenu = createContextMenu(baseOptions());
        currentMenu.destroy();

        currentMenu.updateItems([{ id: "x", label: "X" }]);
        expect(warnSpy).toHaveBeenCalled();

        warnSpy.mockRestore();
    });
});

// ============================================================================
// THEME
// ============================================================================

describe("theme", () =>
{
    test("applies dark theme class when theme is dark", () =>
    {
        currentMenu = createContextMenu(baseOptions({ theme: "dark" }));

        const menu = getMenu();
        expect(menu?.classList.contains("contextmenu-dark")).toBe(true);
    });

    test("applies light theme class when theme is light", () =>
    {
        currentMenu = createContextMenu(baseOptions({ theme: "light" }));

        const menu = getMenu();
        expect(menu?.classList.contains("contextmenu-light")).toBe(true);
    });

    test("no theme class when theme is auto", () =>
    {
        currentMenu = createContextMenu(baseOptions({ theme: "auto" }));

        const menu = getMenu();
        expect(menu?.classList.contains("contextmenu-dark")).toBe(false);
        expect(menu?.classList.contains("contextmenu-light")).toBe(false);
    });
});

// ============================================================================
// ANIMATION
// ============================================================================

describe("animation", () =>
{
    test("menu starts with opacity 0 for fade animation", () =>
    {
        currentMenu = createContextMenu(baseOptions({ animation: "fade" }));

        const menu = getMenu();
        expect(menu?.style.opacity).toBe("0");
    });

    test("menu starts with opacity 1 for none animation", () =>
    {
        currentMenu = createContextMenu(baseOptions({ animation: "none" }));

        const menu = getMenu();
        expect(menu?.style.opacity).toBe("1");
    });
});
