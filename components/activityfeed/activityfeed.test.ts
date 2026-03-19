/**
 * TESTS: ActivityFeed
 * Vitest unit tests for the ActivityFeed component.
 * Covers: factory, options, DOM structure, ARIA, handle methods,
 * callbacks, compact mode, date grouping, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
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

    test("destroyTwice_LogsWarning", () =>
    {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const feed = createActivityFeed(makeOptions(), "test-activityfeed");
        feed.destroy();
        feed.destroy();
        expect(warnSpy).toHaveBeenCalled();
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
    test("showInMissingContainer_LogsError", () =>
    {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const feed = new ActivityFeed(makeOptions());
        feed.show("nonexistent-container");
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
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
