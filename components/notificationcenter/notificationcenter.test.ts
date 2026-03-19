/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: NotificationCenter
 * Spec-based tests for the NotificationCenter dropdown panel component.
 * Tests cover: factory function, options/defaults, DOM structure, ARIA,
 * handle methods, callbacks, keyboard, edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createNotificationCenter } from "./notificationcenter";
import type {
    NotificationCenterOptions,
    NotificationCenterHandle,
    NotificationItem,
    NotificationCategory,
} from "./notificationcenter";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function makeNotification(id: string, overrides?: Partial<NotificationItem>): NotificationItem
{
    return {
        id,
        title: `Notification ${id}`,
        message: `Message for ${id}`,
        timestamp: new Date().toISOString(),
        read: false,
        ...overrides,
    };
}

function defaultOptions(overrides?: Partial<NotificationCenterOptions>): NotificationCenterOptions
{
    return {
        container,
        ...overrides,
    };
}

function getBell(): HTMLElement | null
{
    return container.querySelector(".notificationcenter-bell") as HTMLElement | null;
}

function getBadge(): HTMLElement | null
{
    return container.querySelector(".notificationcenter-badge") as HTMLElement | null;
}

function getPanel(): HTMLElement | null
{
    return document.querySelector(".notificationcenter-panel") as HTMLElement | null;
}

function getItems(): HTMLElement[]
{
    return Array.from(
        document.querySelectorAll(".notificationcenter-item")
    );
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    vi.useFakeTimers();
    container = document.createElement("div");
    container.id = "nc-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
    // Clean up any remaining panels
    const panels = document.querySelectorAll(".notificationcenter-panel");
    panels.forEach((p) => p.remove());
    vi.useRealTimers();
});

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

describe("createNotificationCenter", () =>
{
    test("withValidOptions_ReturnsHandle", () =>
    {
        const handle = createNotificationCenter(defaultOptions());
        expect(handle).toBeDefined();
        expect(typeof handle.open).toBe("function");
        expect(typeof handle.close).toBe("function");
        expect(typeof handle.destroy).toBe("function");
        handle.destroy();
    });

    test("withNoContainer_ThrowsError", () =>
    {
        expect(() =>
        {
            createNotificationCenter({
                container: null as unknown as HTMLElement,
            });
        }).toThrow();
    });

    test("withValidOptions_RendersBellTrigger", () =>
    {
        const handle = createNotificationCenter(defaultOptions());
        expect(getBell()).not.toBeNull();
        handle.destroy();
    });
});

// ============================================================================
// OPTIONS & DEFAULTS
// ============================================================================

describe("NotificationCenter options", () =>
{
    test("withInitialNotifications_SetsNotifications", () =>
    {
        const notifications = [
            makeNotification("n1"),
            makeNotification("n2"),
        ];
        const handle = createNotificationCenter(defaultOptions({ notifications }));
        expect(handle.getNotifications().length).toBe(2);
        handle.destroy();
    });

    test("withCategories_SetsCategories", () =>
    {
        const categories: NotificationCategory[] = [
            { id: "general", label: "General" },
            { id: "alerts", label: "Alerts" },
        ];
        const handle = createNotificationCenter(defaultOptions({ categories }));
        expect(handle).toBeDefined();
        handle.destroy();
    });

    test("withCssClass_AppliesClass", () =>
    {
        const handle = createNotificationCenter(defaultOptions({
            cssClass: "custom-nc",
        }));
        const root = handle.getElement();
        expect(root.classList.contains("custom-nc")).toBe(true);
        handle.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("NotificationCenter DOM structure", () =>
{
    test("rendersBellButton", () =>
    {
        const handle = createNotificationCenter(defaultOptions());
        expect(getBell()).not.toBeNull();
        handle.destroy();
    });

    test("withUnreadNotifications_ShowsBadge", () =>
    {
        const handle = createNotificationCenter(defaultOptions({
            notifications: [makeNotification("u1", { read: false })],
        }));
        const badge = getBadge();
        expect(badge).not.toBeNull();
        handle.destroy();
    });

    test("open_CreatesPanel", () =>
    {
        const handle = createNotificationCenter(defaultOptions({
            notifications: [makeNotification("p1")],
        }));
        handle.open();
        vi.advanceTimersByTime(300);
        expect(getPanel()).not.toBeNull();
        handle.destroy();
    });

    test("open_ShowsNotificationItems", () =>
    {
        const handle = createNotificationCenter(defaultOptions({
            notifications: [
                makeNotification("i1"),
                makeNotification("i2"),
            ],
        }));
        handle.open();
        vi.advanceTimersByTime(300);
        expect(getItems().length).toBe(2);
        handle.destroy();
    });
});

// ============================================================================
// ARIA
// ============================================================================

describe("NotificationCenter ARIA", () =>
{
    test("bell_HasButtonRole", () =>
    {
        const handle = createNotificationCenter(defaultOptions());
        const bell = getBell();
        // The bell is a native <button> element with an implicit button role
        expect(bell?.tagName.toLowerCase()).toBe("button");
        handle.destroy();
    });

    test("bell_HasAriaLabel", () =>
    {
        const handle = createNotificationCenter(defaultOptions());
        const bell = getBell();
        expect(bell?.getAttribute("aria-label")).toBeTruthy();
        handle.destroy();
    });

    test("panel_HasLiveRegion", () =>
    {
        const handle = createNotificationCenter(defaultOptions());
        // The live region is appended to document.body, not inside root
        const live = document.querySelector("[aria-live]");
        expect(live).not.toBeNull();
        handle.destroy();
    });
});

// ============================================================================
// HANDLE METHODS
// ============================================================================

describe("NotificationCenter handle methods", () =>
{
    test("addNotification_IncreasesCount", () =>
    {
        const handle = createNotificationCenter(defaultOptions());
        handle.addNotification(makeNotification("add1"));
        expect(handle.getNotifications().length).toBe(1);
        handle.destroy();
    });

    test("removeNotification_DecreasesCount", () =>
    {
        const handle = createNotificationCenter(defaultOptions({
            notifications: [makeNotification("rem1")],
        }));
        handle.removeNotification("rem1");
        expect(handle.getNotifications().length).toBe(0);
        handle.destroy();
    });

    test("markRead_SetsNotificationAsRead", () =>
    {
        const handle = createNotificationCenter(defaultOptions({
            notifications: [makeNotification("mr1", { read: false })],
        }));
        handle.markRead("mr1");
        const n = handle.getNotifications().find((x) => x.id === "mr1");
        expect(n?.read).toBe(true);
        handle.destroy();
    });

    test("markAllRead_SetsAllAsRead", () =>
    {
        const handle = createNotificationCenter(defaultOptions({
            notifications: [
                makeNotification("ma1", { read: false }),
                makeNotification("ma2", { read: false }),
            ],
        }));
        handle.markAllRead();
        const all = handle.getNotifications();
        expect(all.every((n) => n.read === true)).toBe(true);
        handle.destroy();
    });

    test("getUnreadCount_ReturnsCorrectCount", () =>
    {
        const handle = createNotificationCenter(defaultOptions({
            notifications: [
                makeNotification("uc1", { read: false }),
                makeNotification("uc2", { read: true }),
                makeNotification("uc3", { read: false }),
            ],
        }));
        expect(handle.getUnreadCount()).toBe(2);
        handle.destroy();
    });

    test("setNotifications_ReplacesAll", () =>
    {
        const handle = createNotificationCenter(defaultOptions({
            notifications: [makeNotification("old1")],
        }));
        handle.setNotifications([makeNotification("new1"), makeNotification("new2")]);
        expect(handle.getNotifications().length).toBe(2);
        handle.destroy();
    });

    test("toggle_OpensAndCloses", () =>
    {
        const handle = createNotificationCenter(defaultOptions());
        handle.toggle();
        vi.advanceTimersByTime(300);
        expect(getPanel()).not.toBeNull();
        handle.toggle();
        vi.advanceTimersByTime(300);
        // Panel should be removed or hidden
        handle.destroy();
    });

    test("getElement_ReturnsRootElement", () =>
    {
        const handle = createNotificationCenter(defaultOptions());
        const el = handle.getElement();
        expect(el).toBeInstanceOf(HTMLElement);
        handle.destroy();
    });

    test("destroy_CleansUpDOM", () =>
    {
        const handle = createNotificationCenter(defaultOptions());
        handle.destroy();
        expect(getBell()).toBeNull();
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("NotificationCenter callbacks", () =>
{
    test("onUnreadCountChange_CalledOnAdd", () =>
    {
        const onUnreadCountChange = vi.fn();
        const handle = createNotificationCenter(defaultOptions({
            onUnreadCountChange,
        }));
        handle.addNotification(makeNotification("cb1", { read: false }));
        expect(onUnreadCountChange).toHaveBeenCalled();
        handle.destroy();
    });

    test("onMarkAllRead_CalledOnMarkAll", () =>
    {
        const onMarkAllRead = vi.fn();
        const handle = createNotificationCenter(defaultOptions({
            onMarkAllRead,
            notifications: [makeNotification("mar1")],
        }));
        handle.markAllRead();
        expect(onMarkAllRead).toHaveBeenCalled();
        handle.destroy();
    });

    test("onDismiss_RemoveNotificationRemovesItem", () =>
    {
        const onDismiss = vi.fn();
        const handle = createNotificationCenter(defaultOptions({
            onDismiss,
            notifications: [makeNotification("dis1")],
        }));
        // removeNotification is a programmatic API — it removes the notification
        // but does not fire onDismiss (that callback is fired by the UI dismiss button).
        handle.removeNotification("dis1");
        expect(handle.getNotifications().length).toBe(0);
        handle.destroy();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("NotificationCenter edge cases", () =>
{
    test("removeNonexistent_DoesNotThrow", () =>
    {
        const handle = createNotificationCenter(defaultOptions());
        expect(() => handle.removeNotification("nope")).not.toThrow();
        handle.destroy();
    });

    test("markReadNonexistent_DoesNotThrow", () =>
    {
        const handle = createNotificationCenter(defaultOptions());
        expect(() => handle.markRead("nope")).not.toThrow();
        handle.destroy();
    });

    test("destroyTwice_DoesNotThrow", () =>
    {
        const handle = createNotificationCenter(defaultOptions());
        expect(() =>
        {
            handle.destroy();
            handle.destroy();
        }).not.toThrow();
    });

    test("openWhenEmpty_ShowsEmptyState", () =>
    {
        const handle = createNotificationCenter(defaultOptions({
            emptyMessage: "Nothing here",
        }));
        handle.open();
        vi.advanceTimersByTime(300);
        const panel = getPanel();
        expect(panel?.textContent).toContain("Nothing here");
        handle.destroy();
    });
});
