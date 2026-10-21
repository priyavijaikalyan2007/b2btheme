/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: Timeline
 * Vitest unit tests for the Timeline component.
 * Covers: factory, options, DOM structure, ARIA, items, groups,
 * selection, viewport, now marker, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    Timeline,
    createTimeline,
} from "./timeline";
import type
{
    TimelineOptions,
    TimelineItem,
    TimelineGroup,
} from "./timeline";

// DEBT-TEST-1c. Side-effect import: this is how InlineToolbar reaches a
// page, and the toolbar block below mounts the real one.
import "../inlinetoolbar/inlinetoolbar";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

const NOW = new Date("2026-03-19T12:00:00Z");
const HOUR_BEFORE = new Date("2026-03-19T11:00:00Z");
const HOUR_AFTER = new Date("2026-03-19T13:00:00Z");
const TWO_HOURS_AFTER = new Date("2026-03-19T14:00:00Z");

function makeItem(overrides?: Partial<TimelineItem>): TimelineItem
{
    return {
        id: "item-" + Math.random().toString(36).slice(2, 6),
        type: "point",
        start: NOW,
        label: "Test Event",
        ...overrides,
    };
}

function makeOptions(
    overrides?: Partial<TimelineOptions>
): TimelineOptions
{
    return {
        containerId: "test-timeline",
        start: HOUR_BEFORE,
        end: TWO_HOURS_AFTER,
        items: [makeItem({ id: "i1" })],
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "test-timeline";
    document.body.appendChild(container);
});

afterEach(() =>
{
    document.body.innerHTML = "";
});

// ============================================================================
// FACTORY — createTimeline
// ============================================================================

describe("createTimeline", () =>
{
    test("returnsTimelineInstance", () =>
    {
        const tl = createTimeline(makeOptions());
        expect(tl).toBeInstanceOf(Timeline);
        tl.destroy();
    });

    test("mountsInContainer", () =>
    {
        const tl = createTimeline(makeOptions());
        expect(container.children.length).toBeGreaterThan(0);
        tl.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("DOM structure", () =>
{
    test("rootElement_HasTimelineClass", () =>
    {
        const tl = createTimeline(makeOptions());
        const root = container.querySelector(".timeline");
        expect(root).not.toBeNull();
        tl.destroy();
    });

    test("rendersTimeAxis", () =>
    {
        const tl = createTimeline(makeOptions({ showHeader: true }));
        const axis = container.querySelector(".timeline-axis");
        expect(axis).not.toBeNull();
        tl.destroy();
    });

    test("rendersPointItems", () =>
    {
        const tl = createTimeline(makeOptions({
            items: [makeItem({ id: "p1", type: "point" })],
        }));
        const points = container.querySelectorAll(".timeline-item-point");
        expect(points.length).toBe(1);
        tl.destroy();
    });

    test("rendersSpanItems", () =>
    {
        const tl = createTimeline(makeOptions({
            items: [makeItem({
                id: "s1",
                type: "span",
                start: NOW,
                end: HOUR_AFTER,
            })],
        }));
        const spans = container.querySelectorAll(".timeline-item-span");
        expect(spans.length).toBe(1);
        tl.destroy();
    });
});

// ============================================================================
// ARIA / ACCESSIBILITY
// ============================================================================

describe("accessibility", () =>
{
    test("rootHasAriaLabel", () =>
    {
        const tl = createTimeline(makeOptions());
        const root = container.querySelector(".timeline");
        expect(root?.getAttribute("role")).toBeTruthy();
        tl.destroy();
    });
});

// ============================================================================
// OPTIONS
// ============================================================================

describe("options", () =>
{
    test("showNowMarker_RendersMarkerLine", () =>
    {
        // Mock Date.now to fall within the viewport window
        const originalNow = Date.now;
        Date.now = () => NOW.getTime();
        const tl = createTimeline(makeOptions({ showNowMarker: true }));
        const marker = container.querySelector(".timeline-now-marker");
        expect(marker).not.toBeNull();
        tl.destroy();
        Date.now = originalNow;
    });

    test("sizeVariant_AppliesSizeClass", () =>
    {
        const tl = createTimeline(makeOptions({ size: "sm" }));
        const root = container.querySelector(".timeline");
        expect(root?.classList.contains("timeline--sm")).toBe(true);
        tl.destroy();
    });

    test("cssClass_AppliedToRoot", () =>
    {
        const tl = createTimeline(makeOptions({ cssClass: "custom-tl" }));
        const root = container.querySelector(".timeline");
        expect(root?.classList.contains("custom-tl")).toBe(true);
        tl.destroy();
    });

    test("disabled_AddsDisabledAttribute", () =>
    {
        const tl = createTimeline(makeOptions({ disabled: true }));
        const root = container.querySelector(".timeline");
        expect(
            root?.classList.contains("timeline--disabled")
        ).toBe(true);
        tl.destroy();
    });
});

// ============================================================================
// GROUPS
// ============================================================================

describe("groups", () =>
{
    test("withGroups_RendersGroupLabels", () =>
    {
        const groups: TimelineGroup[] = [
            { id: "g1", label: "Group A" },
            { id: "g2", label: "Group B" },
        ];
        const items = [
            makeItem({ id: "i1", group: "g1" }),
            makeItem({ id: "i2", group: "g2" }),
        ];
        const tl = createTimeline(makeOptions({
            groups,
            items,
            showGroupLabels: true,
        }));
        const labels = container.querySelectorAll(".timeline-group-label");
        expect(labels.length).toBe(2);
        tl.destroy();
    });
});

// ============================================================================
// LIFECYCLE
// ============================================================================

describe("lifecycle", () =>
{
    test("destroy_RemovesDOMElements", () =>
    {
        const tl = createTimeline(makeOptions());
        tl.destroy();
        expect(container.querySelector(".timeline")).toBeNull();
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("callbacks", () =>
{
    test("onItemClick_FiresWhenItemClicked", () =>
    {
        const onItemClick = vi.fn();
        const tl = createTimeline(makeOptions({
            items: [makeItem({ id: "click-item" })],
            onItemClick,
        }));
        const item = container.querySelector(
            ".timeline-item-point, .timeline-item-span"
        ) as HTMLElement;
        item?.click();
        expect(onItemClick).toHaveBeenCalled();
        tl.destroy();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("missingContainer_Throws", () =>
    {
        // ERR-1. This case asserted the defect: a container that is
        // not there used to be logged and walked past. AGENTS.md
        // calls that returning a null object.
        expect(() => createTimeline(makeOptions({ containerId: "nonexistent" }))).toThrow(/was not found/);
    });

    test("emptyItems_RendersWithoutCrash", () =>
    {
        const tl = createTimeline(makeOptions({ items: [] }));
        expect(container.querySelector(".timeline")).not.toBeNull();
        tl.destroy();
    });

    test("spanWithoutEnd_RefusesRatherThanRenderingAHairline", () =>
    {
        // The block here was named `spanWithoutEnd_TreatedAsPoint`
        // and asserted `.not.toThrow()`. MEASURED: the component does
        // NOT treat it as a point. `renderItem` branches on `type`
        // alone, so the item went down `renderSpanItem` and rendered
        // as `class="timeline-item timeline-item-span"` with
        // `width: 0.1%` — a bar too narrow to see, holding a label
        // nothing can read, with no error. `TimelineItem.end` is
        // documented "required for spans" and TypeScript cannot
        // enforce it, because points share the interface (ADR-200).
        expect(() => createTimeline(makeOptions({
            items: [makeItem({ id: "bad-span", type: "span" })],
        }))).toThrow(/"bad-span" is a span with no end/);
    });

    test("spanWithAnEnd_RendersASpan", () =>
    {
        // The accept half. Without it the refusal above would also
        // hold for a Timeline that rejected every span.
        const tl = createTimeline(makeOptions({
            items: [makeItem({
                id: "good-span",
                type: "span",
                end: new Date("2026-06-01"),
            })],
        }));

        const el = container.querySelector("[data-item-id='good-span']");

        expect(el).not.toBeNull();
        expect(el!.classList.contains("timeline-item-span")).toBe(true);
        tl.destroy();
    });
});

// ============================================================================
// CategorizedDataInlineToolbar (ADR-128)
// ============================================================================

describe("CategorizedDataInlineToolbar (ADR-128)", () =>
{
    /*
     * DEBT-TEST-1c. THIS BLOCK USED TO BUILD ITS OWN INLINETOOLBAR.
     * The fake recorded `opts.items` and the click helper invoked
     * `item.onClick?.()` on the captured object, so no button was ever
     * rendered and nothing the real component does to a click — the
     * delegation, the toggle flip, the two arguments it passes — was
     * under test. The optional call made it worse: an item that lost
     * its handler would have been silently skipped.
     *
     * `../inlinetoolbar/inlinetoolbar` registers the real factory as a
     * side effect of the import, which is how a CDN consumer gets it.
     */

    function toolbarButton(id: string): HTMLElement
    {
        const btn = container.querySelector<HTMLElement>(`[data-item-id="${id}"]`);
        if (btn === null) { throw new Error(`no toolbar button rendered for "${id}"`); }
        return btn;
    }

    function clickToolbarItem(id: string): void
    {
        toolbarButton(id).click();
    }

    function makeGroupedOptions(
        labels: string[]
    ): TimelineOptions
    {
        const groups: TimelineGroup[] = labels.map((label, i) => ({
            id: `g${i}`,
            label,
        }));
        const items = labels.map((_, i) =>
            makeItem({ id: `i${i}`, group: `g${i}` })
        );
        return makeOptions({ groups, items, showGroupLabels: true });
    }

    test("theRealFactoryIsRegistered_SoTheseTestsMountIt", () =>
    {
        // The guard ADR-200 asks for. Every case below would pass by
        // taking the no-factory branch if the import stopped
        // registering, and the header assertions would read as a
        // deliberate opt-out rather than a missing component.
        expect(typeof window.createInlineToolbar).toBe("function");
    });

    test("showInlineToolbar_DefaultFalse_NoHeaderInDOM", () =>
    {
        const tl = createTimeline(makeOptions());
        const header = container.querySelector(".timeline-toolbar-header");
        expect(header).toBeNull();
        tl.destroy();
    });

    test("showInlineToolbar_True_WithFactory_HeaderPresent", () =>
    {
        const tl = createTimeline(makeOptions({ showInlineToolbar: true }));
        const header = container.querySelector(".timeline-toolbar-header");
        expect(header).not.toBeNull();
        tl.destroy();
    });

    test("showInlineToolbar_True_NoFactory_Refuses", () =>
    {
        // FALLBACK-14. The old name said LogsWarnNoThrow, which is an
        // accurate description of the behaviour and of the fault.
        const real = window.createInlineToolbar;
        delete (window as unknown as Record<string, unknown>).createInlineToolbar;

        try
        {
            expect(() => createTimeline(makeOptions({ showInlineToolbar: true })))
                .toThrow(/createInlineToolbar is not loaded/);
        }
        finally
        {
            window.createInlineToolbar = real;
        }
    });


    test("showInlineToolbar_FactoryThrows_PropagatesWithItsCause", () =>
    {
        // FALLBACK-14. The old `catch` logged the error and set the
        // handle to null, so the original fault never reached the
        // caller and the toolbar silently did not exist.
        const real = window.createInlineToolbar;
        const boom = new Error("toolbar blew up during construction");
        (window as unknown as Record<string, unknown>).createInlineToolbar =
            () => { throw boom; };
        let caught: Error | null = null;

        try { createTimeline(makeOptions({ showInlineToolbar: true })); }
        catch (e) { caught = e as Error; }
        finally { window.createInlineToolbar = real; }

        expect(caught).not.toBeNull();
        expect((caught as Error & { cause?: unknown }).cause).toBe(boom);
    });

    test("setSortMode_Asc_SortsGroupsByLabelAscending", () =>
    {
        const tl = createTimeline(
            makeGroupedOptions(["Charlie", "Alpha", "Bravo"])
        );
        tl.setSortMode("asc");
        const labels = Array.from(
            container.querySelectorAll(".timeline-group-label-text")
        ).map((el) => el.textContent);
        expect(labels).toEqual(["Alpha", "Bravo", "Charlie"]);
        tl.destroy();
    });

    test("setSortMode_Desc_SortsGroupsByLabelDescending", () =>
    {
        const tl = createTimeline(
            makeGroupedOptions(["Charlie", "Alpha", "Bravo"])
        );
        tl.setSortMode("desc");
        const labels = Array.from(
            container.querySelectorAll(".timeline-group-label-text")
        ).map((el) => el.textContent);
        expect(labels).toEqual(["Charlie", "Bravo", "Alpha"]);
        tl.destroy();
    });

    test("setSortMode_Null_RestoresOriginalOrder", () =>
    {
        const tl = createTimeline(
            makeGroupedOptions(["Charlie", "Alpha", "Bravo"])
        );
        tl.setSortMode("asc");
        tl.setSortMode(null);
        const labels = Array.from(
            container.querySelectorAll(".timeline-group-label-text")
        ).map((el) => el.textContent);
        expect(labels).toEqual(["Charlie", "Alpha", "Bravo"]);
        tl.destroy();
    });

    test("setSortMode_FiresOnSortModeChange", () =>
    {
        const onSortModeChange = vi.fn();
        const tl = createTimeline(makeOptions({
            showInlineToolbar: true,
            onSortModeChange,
        }));
        tl.setSortMode("asc");
        expect(onSortModeChange).toHaveBeenCalledWith("asc");
        tl.destroy();
    });

    test("setSortMode_Idempotent_NoCallbackWhenUnchanged", () =>
    {
        const onSortModeChange = vi.fn();
        const tl = createTimeline(makeOptions({
            showInlineToolbar: true,
            initialSortMode: "asc",
            onSortModeChange,
        }));
        tl.setSortMode("asc");
        expect(onSortModeChange).not.toHaveBeenCalled();
        tl.destroy();
    });

    test("expandAll_FiresOnCollapseStateChangeAllExpanded", () =>
    {
        const onCollapseStateChange = vi.fn();
        const groups: TimelineGroup[] = [
            { id: "g1", label: "G1", collapsed: true },
            { id: "g2", label: "G2", collapsed: true },
        ];
        const tl = createTimeline(makeOptions({
            groups,
            items: [makeItem({ id: "i1", group: "g1" })],
            onCollapseStateChange,
        }));
        tl.expandAll();
        expect(onCollapseStateChange).toHaveBeenCalledWith("all-expanded");
        tl.destroy();
    });

    test("collapseAll_FiresOnCollapseStateChangeAllCollapsed", () =>
    {
        const onCollapseStateChange = vi.fn();
        const groups: TimelineGroup[] = [
            { id: "g1", label: "G1" },
            { id: "g2", label: "G2" },
        ];
        const tl = createTimeline(makeOptions({
            groups,
            items: [makeItem({ id: "i1", group: "g1" })],
            onCollapseStateChange,
        }));
        tl.collapseAll();
        expect(onCollapseStateChange).toHaveBeenCalledWith("all-collapsed");
        tl.destroy();
    });

    test("toolbarSortAscClick_TogglesAscThenNull", () =>
    {
        const onSortModeChange = vi.fn();
        const tl = createTimeline(makeOptions({
            showInlineToolbar: true,
            onSortModeChange,
        }));
        clickToolbarItem("tl-sort-asc");
        expect(tl.getSortMode()).toBe("asc");
        clickToolbarItem("tl-sort-asc");
        expect(tl.getSortMode()).toBeNull();
        tl.destroy();
    });
});
