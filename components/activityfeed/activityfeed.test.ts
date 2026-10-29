/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: ActivityFeed
 * Vitest unit tests for the ActivityFeed component.
 * Covers: factory, options, DOM structure, ARIA, handle methods,
 * callbacks, compact mode, date grouping, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { destroyProbe } from "../../tests/destroy-probe";
import
{
    ActivityFeed,
    createActivityFeed,
} from "./activityfeed";
import type
{
    ActivityFeedOptions,
    ActivityEvent,
    ActivityActor,
} from "./activityfeed";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeActor(overrides?: Partial<ActivityActor>): ActivityActor
{
    return {
        id: "actor-1",
        name: "Alice",
        ...overrides,
    };
}

function makeEvent(overrides?: Partial<ActivityEvent>): ActivityEvent
{
    return {
        id: "evt-" + Math.random().toString(36).slice(2, 6),
        actor: makeActor(),
        action: "created a document",
        timestamp: new Date(),
        ...overrides,
    };
}

function makeOptions(overrides?: Partial<ActivityFeedOptions>): ActivityFeedOptions
{
    return {
        events: [makeEvent({ id: "evt-1" }), makeEvent({ id: "evt-2" })],
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "test-activityfeed";
    document.body.appendChild(container);
});

afterEach(() =>
{
    document.body.innerHTML = "";
});

// ============================================================================
// FACTORY — createActivityFeed
// ============================================================================

describe("createActivityFeed", () =>
{
    test("withContainerId_MountsInContainer", () =>
    {
        const feed = createActivityFeed(makeOptions(), "test-activityfeed");
        expect(container.querySelector(".activityfeed")).not.toBeNull();
        feed.destroy();
    });

    test("withoutContainerId_ReturnsInstanceNotMounted", () =>
    {
        const feed = createActivityFeed(makeOptions());
        expect(container.querySelector(".activityfeed")).toBeNull();
        expect(feed.getElement()).not.toBeNull();
        feed.destroy();
    });

    test("returnsActivityFeedInstance", () =>
    {
        const feed = createActivityFeed(makeOptions());
        expect(feed).toBeInstanceOf(ActivityFeed);
        feed.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("DOM structure", () =>
{
    test("rootElement_HasActivityfeedClass", () =>
    {
        const feed = createActivityFeed(makeOptions(), "test-activityfeed");
        const root = container.querySelector(".activityfeed");
        expect(root).not.toBeNull();
        feed.destroy();
    });

    test("withEvents_RendersEventItems", () =>
    {
        const feed = createActivityFeed(makeOptions(), "test-activityfeed");
        const items = container.querySelectorAll(".activityfeed-event");
        expect(items.length).toBe(2);
        feed.destroy();
    });

    test("withNoEvents_ShowsEmptyState", () =>
    {
        const feed = createActivityFeed(
            makeOptions({ events: [] }), "test-activityfeed"
        );
        const empty = container.querySelector(".activityfeed-empty");
        expect(empty).not.toBeNull();
        feed.destroy();
    });
});

// ============================================================================
// ARIA / ACCESSIBILITY
// ============================================================================

describe("accessibility", () =>
{
    test("rootHasFeedRole", () =>
    {
        const feed = createActivityFeed(makeOptions(), "test-activityfeed");
        const feedEl = container.querySelector(".activityfeed-feed");
        expect(feedEl?.getAttribute("role")).toBe("feed");
        feed.destroy();
    });

    test("liveRegionExists", () =>
    {
        const feed = createActivityFeed(makeOptions(), "test-activityfeed");
        const live = container.querySelector("[aria-live]");
        expect(live).not.toBeNull();
        feed.destroy();
    });
});

// ============================================================================
// OPTIONS
// ============================================================================

describe("options", () =>
{
    test("compact_AddsCompactClass", () =>
    {
        const feed = createActivityFeed(
            makeOptions({ compact: true }), "test-activityfeed"
        );
        const root = container.querySelector(".activityfeed");
        expect(root?.classList.contains("activityfeed-compact")).toBe(true);
        feed.destroy();
    });

    test("groupByDate_CreatesDateGroups", () =>
    {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const feed = createActivityFeed(makeOptions({
            groupByDate: true,
            events: [
                makeEvent({ id: "e1", timestamp: new Date() }),
                makeEvent({ id: "e2", timestamp: yesterday }),
            ],
        }), "test-activityfeed");

        const groups = container.querySelectorAll(".activityfeed-group");
        expect(groups.length).toBeGreaterThanOrEqual(2);
        feed.destroy();
    });

    test("cssClass_AppliedToRoot", () =>
    {
        const feed = createActivityFeed(
            makeOptions({ cssClass: "my-feed" }), "test-activityfeed"
        );
        const root = container.querySelector(".activityfeed");
        expect(root?.classList.contains("my-feed")).toBe(true);
        feed.destroy();
    });
});

// ============================================================================
// PUBLIC API — addEvent
// ============================================================================

describe("addEvent", () =>
{
    test("addsSingleEvent_IncreasesItemCount", () =>
    {
        const feed = createActivityFeed(
            makeOptions({ events: [] }), "test-activityfeed"
        );
        feed.addEvent(makeEvent({ id: "new-1" }));
        const items = container.querySelectorAll(".activityfeed-event");
        expect(items.length).toBe(1);
        feed.destroy();
    });
});

// ============================================================================
// PUBLIC API — show / hide / destroy
// ============================================================================

describe("lifecycle", () =>
{
    test("show_AppendsToContainer", () =>
    {
        const feed = new ActivityFeed(makeOptions());
        feed.show("test-activityfeed");
        expect(container.querySelector(".activityfeed")).not.toBeNull();
        feed.destroy();
    });

    test("hide_RemovesFromDOM", () =>
    {
        const feed = createActivityFeed(makeOptions(), "test-activityfeed");
        feed.hide();
        expect(container.querySelector(".activityfeed")).toBeNull();
        feed.destroy();
    });

    test("destroy_NullifiesElement", () =>
    {
        const feed = createActivityFeed(makeOptions(), "test-activityfeed");
        feed.destroy();
        expect(feed.getElement()).toBeNull();
    });

    test("destroyTwice_IsSilentAndIdempotent", () =>
    {
        // LOG-7. This used to assert the warning. A second `destroy()`
        // is ADR-081's contract being HONOURED, so warning told the
        // caller they had erred when they had not, on a console the
        // host is not reading. The claim that was always worth making
        // is that the second call repeats nothing.
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const feed = createActivityFeed(makeOptions(), "test-activityfeed");
        const probe = destroyProbe();

        feed.destroy();
        const first = probe.total();
        feed.destroy();

        expect(first).toBeGreaterThan(0);
        expect(probe.total()).toBe(first);
        expect(warnSpy).not.toHaveBeenCalled();
        probe.restore();
        warnSpy.mockRestore();
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("callbacks", () =>
{
    test("onEventClick_FiresWhenItemClicked", () =>
    {
        const onEventClick = vi.fn();
        const evt = makeEvent({ id: "click-1" });
        const feed = createActivityFeed(
            makeOptions({ events: [evt], onEventClick }), "test-activityfeed"
        );
        const item = container.querySelector(".activityfeed-event") as HTMLElement;
        item?.click();
        expect(onEventClick).toHaveBeenCalled();
        feed.destroy();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("showInMissingContainer_Throws", () =>
    {
        // ERR-1. This case asserted the defect: a container that is
        // not there used to be logged and walked past. AGENTS.md
        // calls that returning a null object.
        const feed = new ActivityFeed(makeOptions());
        expect(() => feed.show("nonexistent-container")).toThrow(/was not found/);
        feed.destroy();
    });

    test("emptyEvents_EmptyStateShown", () =>
    {
        const feed = createActivityFeed(
            makeOptions({ events: [] }), "test-activityfeed"
        );
        expect(container.querySelector(".activityfeed-empty")).not.toBeNull();
        feed.destroy();
    });
});

// ============================================================================
// LIVE REGION — UNUSED-1
// ============================================================================

describe("new activity reaches the live region", () =>
{
    function liveText(): string
    {
        return container.querySelector(
            "[aria-live='polite']")?.textContent ?? "";
    }

    // `buildLive` creates an aria-live region and appends it on
    // every mount, `announce` writes to it, and NOTHING CALLED
    // EITHER -- so a screen-reader user was told nothing when new
    // activity arrived, which is the entire point of a feed having
    // one. The compiler had been reporting `announce` as unused
    // since it was written (UNUSED-1).
    test("the region is empty until something happens", () =>
    {
        const feed = createActivityFeed(makeOptions());
        feed.show("test-activityfeed");

        expect(liveText()).toBe("");
        feed.destroy();
    });

    test("addEvent announces who did what to what", () =>
    {
        const feed = createActivityFeed(makeOptions());
        feed.show("test-activityfeed");

        feed.addEvent(makeEvent({
            actor: makeActor({ name: "Bruno" }),
            action: "commented on",
            target: "the Q3 plan",
        }));

        expect(liveText()).toBe("Bruno commented on the Q3 plan");
        feed.destroy();
    });

    test("a bulk add announces a count, not every line", () =>
    {
        // The region is `aria-atomic`, so it reads as one utterance
        // and a batch would otherwise be read out in full.
        const feed = createActivityFeed(makeOptions());
        feed.show("test-activityfeed");

        feed.addEvents([makeEvent(), makeEvent(), makeEvent()]);

        expect(liveText()).toBe("3 new activity items");
        feed.destroy();
    });
});

// ============================================================================
// SURFACE CONTRACT (B6): additive on(eventClick | actorClick | targetClick),
// getState/setState and setData. Legacy callbacks keep firing first, once.
// ============================================================================

describe("surface contract (B6)", () =>
{
    const when = new Date(2026, 0, 15, 10, 30);

    function surfaceEvent(overrides?: Partial<ActivityEvent>): ActivityEvent
    {
        return makeEvent({
            id: "evt-s",
            actor: makeActor({ id: "a-9", name: "Bruno", avatar: "https://x.test/b.png" }),
            action: "opened",
            target: "Q3 plan",
            timestamp: when,
            metadata: { secret: { deep: 1 } },
            ...overrides,
        });
    }

    function mount(options?: Partial<ActivityFeedOptions>): ReturnType<typeof createActivityFeed>
    {
        return createActivityFeed(
            makeOptions({ events: [surfaceEvent()], groupByDate: false, ...options }), "test-activityfeed"
        );
    }

    const q = (sel: string): HTMLElement => container.querySelector(sel) as HTMLElement;

    test("on(eventClick)_DeliversEventWithoutMetadata_AfterOnEventClick", () =>
    {
        const order: string[] = [];
        const feed = mount({ onEventClick: () => order.push("option") });
        feed.on("eventClick", () => order.push("channel"));

        q(".activityfeed-event").click();

        expect(order).toEqual(["option", "channel"]);
        feed.destroy();
    });

    test("on(eventClick)_PayloadIsPlainJsonCopyWithoutMetadata", () =>
    {
        const heard = vi.fn();
        const feed = mount();
        feed.on("eventClick", heard);

        q(".activityfeed-event").click();

        const payload = heard.mock.calls[0][0] as Record<string, unknown>;
        expect(payload).toEqual({
            id: "evt-s",
            actor: { id: "a-9", name: "Bruno", avatar: "https://x.test/b.png" },
            action: "opened",
            target: "Q3 plan",
            timestamp: when.toISOString(),
        });
        expect("metadata" in payload).toBe(false);
        expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
        feed.destroy();
    });

    test("on(eventClick)_PayloadMutationDoesNotReachTheComponent", () =>
    {
        const feed = mount();
        feed.on("eventClick", (p) =>
        {
            const e = p as { actor: { name: string }; action: string };
            e.actor.name = "Mallory";
            e.action = "hacked";
        });

        q(".activityfeed-event").click();

        expect(feed.getEvents()[0].actor.name).toBe("Bruno");
        expect(feed.getEvents()[0].action).toBe("opened");
        feed.destroy();
    });

    test("on(eventClick)_EmitsWithNoLegacyCallback", () =>
    {
        const heard = vi.fn();
        const feed = mount();
        feed.on("eventClick", heard);

        q(".activityfeed-event").click();

        expect(heard).toHaveBeenCalledTimes(1);
        feed.destroy();
    });

    test("on(actorClick)_DeliversActorCopy_AfterOnActorClick_AndStopsTheCard", () =>
    {
        const order: string[] = [];
        const heard = vi.fn((p: unknown) => order.push("channel"));
        const feed = mount({
            onActorClick: () => order.push("option"),
            onEventClick: () => order.push("card"),
        });
        feed.on("actorClick", heard);

        q(".activityfeed-actor").click();

        expect(order).toEqual(["option", "channel"]);
        const payload = heard.mock.calls[0][0];
        expect(payload).toEqual({ id: "a-9", name: "Bruno", avatar: "https://x.test/b.png" });
        expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
        feed.destroy();
    });

    test("on(actorClick)_EmitsWithNoLegacyCallback", () =>
    {
        const heard = vi.fn();
        const feed = mount();
        feed.on("actorClick", heard);

        q(".activityfeed-actor").click();

        expect(heard).toHaveBeenCalledTimes(1);
        feed.destroy();
    });

    test("on(actorClick)_PayloadMutationDoesNotReachTheComponent", () =>
    {
        const feed = mount();
        feed.on("actorClick", (p) => { (p as { name: string }).name = "Mallory"; });

        q(".activityfeed-actor").click();

        expect(feed.getEvents()[0].actor.name).toBe("Bruno");
        feed.destroy();
    });

    test("actorClick_WithNoCallbackAndNoSubscriber_StillBubblesToTheCard", () =>
    {
        const onEventClick = vi.fn();
        const feed = mount({ onEventClick });

        q(".activityfeed-actor").click();

        expect(onEventClick).toHaveBeenCalledTimes(1);
        expect(q(".activityfeed-actor").style.cursor).toBe("");
        feed.destroy();
    });

    test("on(targetClick)_DeliversEventWithoutMetadata_AfterOnTargetClick", () =>
    {
        const order: string[] = [];
        const heard = vi.fn(() => order.push("channel"));
        const feed = mount({ onTargetClick: () => order.push("option"), onEventClick: () => order.push("card") });
        feed.on("targetClick", heard);

        q(".activityfeed-target").click();

        expect(order).toEqual(["option", "channel"]);
        const payload = (heard.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
        expect(payload.id).toBe("evt-s");
        expect(payload.target).toBe("Q3 plan");
        expect("metadata" in payload).toBe(false);
        expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
        feed.destroy();
    });

    test("on(targetClick)_EmitsWithNoLegacyCallback_ForSpanAndLink", () =>
    {
        const heard = vi.fn();
        const feed = mount({
            events: [surfaceEvent({ id: "span" }), surfaceEvent({ id: "link", targetUrl: "https://x.test/p" })],
        });
        feed.on("targetClick", heard);

        container.querySelectorAll<HTMLElement>(".activityfeed-target").forEach((el) => el.click());

        expect(heard).toHaveBeenCalledTimes(2);
        feed.destroy();
    });

    test("targetClick_OnLink_PreventsNavigationOnlyWhenSomeoneListens", () =>
    {
        const feed = mount({ events: [surfaceEvent({ targetUrl: "https://x.test/p" })] });
        const link = q("a.activityfeed-target");
        const plain = new MouseEvent("click", { bubbles: true, cancelable: true });
        link.dispatchEvent(plain);
        expect(plain.defaultPrevented).toBe(false);

        feed.on("targetClick", () => undefined);
        const heard = new MouseEvent("click", { bubbles: true, cancelable: true });
        link.dispatchEvent(heard);
        expect(heard.defaultPrevented).toBe(true);
        feed.destroy();
    });

    test("on_Unsubscribe_StopsDelivery", () =>
    {
        const heard = vi.fn();
        const feed = mount();
        const off = feed.on("eventClick", heard);

        q(".activityfeed-event").click();
        off();
        q(".activityfeed-event").click();

        expect(heard).toHaveBeenCalledTimes(1);
        feed.destroy();
    });

    test("on_ThrowingHandler_IsContained_AndLaterHandlersStillRun", () =>
    {
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const later = vi.fn();
        const feed = mount();
        feed.on("eventClick", () => { throw new Error("boom"); });
        feed.on("eventClick", later);

        q(".activityfeed-event").click();

        expect(later).toHaveBeenCalledTimes(1);
        errSpy.mockRestore();
        feed.destroy();
    });

    test("on_UnknownChannel_Throws_NamingTheValidChannels", () =>
    {
        const feed = mount();

        expect(() => feed.on("bogus", () => undefined)).toThrow(/eventClick.*actorClick.*targetClick/);
        feed.destroy();
    });

    test("setData_Throws_NamingTheSetters", () =>
    {
        const feed = mount();

        expect(() => feed.setData("events", [])).toThrow(/ActivityFeed.*no data slots.*setEvents/);
        feed.destroy();
    });

    test("getState_IsEmpty_AndSetStateDoesNothing", () =>
    {
        const feed = mount();

        expect(feed.getState()).toEqual({});
        feed.setState({ anything: 1 });
        expect(feed.getState()).toEqual({});
        expect(feed.getEvents()).toHaveLength(1);
        feed.destroy();
    });

    test("destroy_ClearsHandlers", () =>
    {
        const heard = vi.fn();
        const feed = mount();
        feed.on("eventClick", heard);
        const card = q(".activityfeed-event");

        feed.destroy();
        card.click();

        expect(heard).not.toHaveBeenCalled();
    });
});
