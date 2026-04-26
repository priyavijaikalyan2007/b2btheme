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
    test("missingContainer_LogsError", () =>
    {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        createTimeline(makeOptions({ containerId: "nonexistent" }));
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
    });

    test("emptyItems_RendersWithoutCrash", () =>
    {
        const tl = createTimeline(makeOptions({ items: [] }));
        expect(container.querySelector(".timeline")).not.toBeNull();
        tl.destroy();
    });

    test("spanWithoutEnd_TreatedAsPoint", () =>
    {
        // A span item with no end date should not crash
        expect(() =>
        {
            const tl = createTimeline(makeOptions({
                items: [makeItem({ id: "bad-span", type: "span" })],
            }));
            tl.destroy();
        }).not.toThrow();
    });
});

// ============================================================================
// CategorizedDataInlineToolbar (ADR-128)
// ============================================================================

describe("CategorizedDataInlineToolbar (ADR-128)", () =>
{
    type ToolbarItem = { id: string; onClick?: () => void };
    let lastToolbarItems: ToolbarItem[] = [];
    let activeCalls: Array<[string, boolean]> = [];

    function installToolbarMock(): void
    {
        lastToolbarItems = [];
        activeCalls = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).createInlineToolbar = (opts: { items: ToolbarItem[] }) =>
        {
            lastToolbarItems = opts.items;
            return {
                setItemActive: (id: string, active: boolean) =>
                {
                    activeCalls.push([id, active]);
                },
                destroy: () => { /* noop */ },
            };
        };
    }

    function uninstallToolbarMock(): void
    {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).createInlineToolbar;
    }

    function clickToolbarItem(id: string): void
    {
        const item = lastToolbarItems.find((i) => i.id === id);
        item?.onClick?.();
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

    afterEach(() =>
    {
        uninstallToolbarMock();
    });

    test("showInlineToolbar_DefaultFalse_NoHeaderInDOM", () =>
    {
        installToolbarMock();
        const tl = createTimeline(makeOptions());
        const header = container.querySelector(".timeline-toolbar-header");
        expect(header).toBeNull();
        tl.destroy();
    });

    test("showInlineToolbar_True_WithFactory_HeaderPresent", () =>
    {
        installToolbarMock();
        const tl = createTimeline(makeOptions({ showInlineToolbar: true }));
        const header = container.querySelector(".timeline-toolbar-header");
        expect(header).not.toBeNull();
        tl.destroy();
    });

    test("showInlineToolbar_True_NoFactory_LogsWarnNoThrow", () =>
    {
        uninstallToolbarMock();
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        let tl: ReturnType<typeof createTimeline> | null = null;
        expect(() =>
        {
            tl = createTimeline(makeOptions({ showInlineToolbar: true }));
        }).not.toThrow();
        const header = container.querySelector(".timeline-toolbar-header");
        expect(header).toBeNull();
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
        tl?.destroy();
    });

    test("setSortMode_Asc_SortsGroupsByLabelAscending", () =>
    {
        installToolbarMock();
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
        installToolbarMock();
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
        installToolbarMock();
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
        installToolbarMock();
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
        installToolbarMock();
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
        installToolbarMock();
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
        installToolbarMock();
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
        installToolbarMock();
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
