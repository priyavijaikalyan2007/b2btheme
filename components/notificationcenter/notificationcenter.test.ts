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
import { destroyProbe } from "../../tests/destroy-probe";
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

    // The categories become a tab strip, and the component prepends
    // an "All" tab of its own -- which is the part a reader would
    // not guess and the part `toBeDefined()` could never show.
    test("withCategories_SetsCategories", () =>
    {
        const categories: NotificationCategory[] = [
            { id: "general", label: "General" },
            { id: "alerts", label: "Alerts" },
        ];
        const handle = createNotificationCenter(defaultOptions({ categories }));

        handle.open();

        expect([...document.querySelectorAll(".notificationcenter-tab")]
            .map((t) => t.textContent)).toEqual(["All", "General", "Alerts"]);
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
    test("removeNonexistent_LeavesTheOthersAlone", () =>
    {
        const handle = createNotificationCenter(defaultOptions());
        handle.addNotification(makeNotification("keep1"));
        handle.addNotification(makeNotification("keep2"));
        const before = handle.getNotifications().map((n) => n.id);

        // The positive control. Reading `before` off an EMPTY centre
        // would make the assertion below hold for a removeNotification
        // that cleared the list, which is the shape this whole pass
        // exists to catch.
        expect(before).toHaveLength(2);

        handle.removeNotification("nope");

        // Removal is the one operation with an honest "already done"
        // reading: the post-condition the caller asked for — no
        // notification with this id — already holds, so there is
        // nothing to refuse (ADR-200). What must hold is that no
        // OTHER notification went with it.
        expect(handle.getNotifications().map((n) => n.id)).toEqual(before);
        handle.destroy();
    });

    test("markReadNonexistent_RefusesAndNamesIt", () =>
    {
        const handle = createNotificationCenter(defaultOptions());
        const before = handle.getUnreadCount();

        // ADR-200. Marking an id that is already read IS idempotent.
        // Marking one that was never here is a state this centre
        // cannot reach, and the silent return left the badge wrong
        // with no way to find out.
        expect(() => handle.markRead("nope"))
            .toThrow(/no notification with id "nope"/);
        expect(handle.getUnreadCount()).toBe(before);
        handle.destroy();
    });

    test("destroyTwice_DoesNotThrow", () =>
    {
        const handle = createNotificationCenter(defaultOptions());
        const probe = destroyProbe();

        handle.destroy();
        const first = probe.total();
        handle.destroy();

        expect(first).toBeGreaterThan(0);
        expect(probe.total()).toBe(first);
        probe.restore();
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

// ============================================================================
// SURFACE CONTRACT (B6): additive on("notificationClick" | "dismiss" |
// "markAllRead"), setData, and empty state. Legacy callbacks fire first.
// ============================================================================

describe("surface contract (B6)", () =>
{
    function openWith(
        items: NotificationItem[],
        overrides?: Partial<NotificationCenterOptions>
    ): NotificationCenterHandle
    {
        const handle = createNotificationCenter(defaultOptions({ notifications: items, ...overrides }));
        handle.open();
        vi.advanceTimersByTime(300);
        return handle;
    }

    function clickDismiss(index: number): void
    {
        const btn = getItems()[index].querySelector(".notificationcenter-item-dismiss") as HTMLElement;
        btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }

    function clickMarkAll(): void
    {
        const btn = document.querySelector(".notificationcenter-mark-all") as HTMLElement;
        btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }

    test("on_NotificationClick_DeliversCopyWithoutData_AfterLegacyCallback", () =>
    {
        const order: string[] = [];
        const handle = openWith(
            [makeNotification("n1", { data: { secret: 1 } })],
            { onNotificationClick: (n) => order.push(`option:${n.id}`) }
        );
        const heard = vi.fn((p: unknown) => order.push(`channel:${(p as NotificationItem).id}`));
        handle.on("notificationClick", heard);

        getItems()[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));

        expect(order).toEqual(["option:n1", "channel:n1"]);
        expect(heard).toHaveBeenCalledTimes(1);
        const payload = heard.mock.calls[0][0] as Record<string, unknown>;
        expect("data" in payload).toBe(false);
        expect(payload).toMatchObject({ id: "n1", title: "Notification n1", read: true });
        handle.destroy();
    });

    test("on_NotificationClick_KeyboardEnter_Emits", () =>
    {
        const heard = vi.fn();
        const handle = openWith([makeNotification("n1")]);
        handle.on("notificationClick", heard);

        getItems()[0].dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

        expect(heard).toHaveBeenCalledTimes(1);
        handle.destroy();
    });

    test("on_NotificationClick_PayloadIsACopy_HandlerCannotMutateTheComponent", () =>
    {
        const handle = openWith([makeNotification("n1")]);
        handle.on("notificationClick", (p) => { (p as NotificationItem).title = "mutated"; });

        getItems()[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));

        expect(handle.getNotifications()[0].title).toBe("Notification n1");
        handle.destroy();
    });

    test("on_NotificationClick_DateTimestamp_PayloadIsJson", () =>
    {
        const stamp = new Date("2026-01-02T03:04:05.000Z");
        const heard = vi.fn();
        const handle = openWith([makeNotification("n1", { timestamp: stamp })]);
        handle.on("notificationClick", heard);

        getItems()[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));

        const payload = heard.mock.calls[0][0];
        expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
        expect((payload as NotificationItem).timestamp).toBe("2026-01-02T03:04:05.000Z");
        handle.destroy();
    });

    test("on_Dismiss_DeliversId_AfterLegacyCallback_ExactlyOnce", () =>
    {
        const order: string[] = [];
        const handle = openWith(
            [makeNotification("d1"), makeNotification("d2")],
            { onDismiss: (id) => order.push(`option:${id}`) }
        );
        handle.on("dismiss", (id) => order.push(`channel:${String(id)}`));

        clickDismiss(0);

        expect(order).toEqual(["option:d1", "channel:d1"]);
        handle.destroy();
    });

    test("on_Dismiss_DeleteKey_Emits_WithNoLegacyCallback", () =>
    {
        const heard = vi.fn();
        const handle = openWith([makeNotification("d1")]);
        handle.on("dismiss", heard);

        getItems()[0].dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }));

        expect(heard).toHaveBeenCalledExactlyOnceWith("d1");
        handle.destroy();
    });

    test("on_MarkAllRead_DeliversIdsThatWereUnread_AfterLegacyCallback", () =>
    {
        const order: string[] = [];
        const handle = openWith(
            [makeNotification("a"), makeNotification("b", { read: true }), makeNotification("c")],
            { onMarkAllRead: () => order.push("option") }
        );
        handle.on("markAllRead", (ids) => order.push(`channel:${(ids as string[]).join(",")}`));

        clickMarkAll();

        expect(order).toEqual(["option", "channel:a,c"]);
        handle.destroy();
    });

    test("on_MarkAllRead_ViaHandleMethod_Emits_WithNoLegacyCallback", () =>
    {
        const heard = vi.fn();
        const handle = createNotificationCenter(defaultOptions({
            notifications: [makeNotification("a"), makeNotification("b")],
        }));
        handle.on("markAllRead", heard);

        handle.markAllRead();
        handle.markAllRead();

        expect(heard).toHaveBeenNthCalledWith(1, ["a", "b"]);
        expect(heard).toHaveBeenNthCalledWith(2, []);
        handle.destroy();
    });

    test("on_Unsubscribe_StopsDelivery", () =>
    {
        const heard = vi.fn();
        const handle = openWith([makeNotification("d1"), makeNotification("d2")]);
        const off = handle.on("dismiss", heard);

        clickDismiss(0);
        off();
        clickDismiss(0);

        expect(heard).toHaveBeenCalledTimes(1);
        handle.destroy();
    });

    test("on_HandlerThatThrows_DoesNotStopOtherHandlers", () =>
    {
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const heard = vi.fn();
        const handle = createNotificationCenter(defaultOptions({ notifications: [makeNotification("a")] }));
        handle.on("markAllRead", () => { throw new Error("boom"); });
        handle.on("markAllRead", heard);

        handle.markAllRead();

        expect(heard).toHaveBeenCalledTimes(1);
        errSpy.mockRestore();
        handle.destroy();
    });

    test("destroy_ClearsHandlers", () =>
    {
        const heard = vi.fn();
        const handle = createNotificationCenter(defaultOptions({ notifications: [makeNotification("a")] }));
        handle.on("markAllRead", heard);

        handle.destroy();
        handle.markAllRead();

        expect(heard).not.toHaveBeenCalled();
    });

    test("on_UnknownChannel_Throws_NamingValidChannels", () =>
    {
        const handle = createNotificationCenter(defaultOptions());

        expect(() => handle.on("bogus", () => undefined)).toThrow(
            /NotificationCenter.*bogus.*notificationClick.*dismiss.*markAllRead/
        );
        handle.destroy();
    });

    test("setData_Throws_NamingTheSetters", () =>
    {
        const handle = createNotificationCenter(defaultOptions());

        expect(() => handle.setData("notifications", [])).toThrow(
            /NotificationCenter.*no data slots.*setNotifications/
        );
        handle.destroy();
    });

    test("getState_IsEmpty_AndSetStateDoesNothing", () =>
    {
        const handle = createNotificationCenter(defaultOptions({ notifications: [makeNotification("a")] }));

        expect(handle.getState()).toEqual({});
        handle.setState({ anything: 1 });
        expect(handle.getState()).toEqual({});
        expect(handle.getNotifications().length).toBe(1);
        handle.destroy();
    });
});
