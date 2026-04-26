/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: d8e9f0a1-b2c3-4d4e-5f6a-7b8c9d0e1f2a
 *
 * ⚓ TESTS: ActionItems
 * Vitest unit tests for the ActionItems component.
 * Covers: factory, add/remove/update items, status cycling, assignee,
 * comment count, selection, sections, filter, sort, export, import,
 * destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createActionItems } from "./actionitems";
import type
{
    ActionItemsOptions,
    ActionItemsHandle,
    ActionItem,
    ActionItemPerson,
} from "./actionitems";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeItems(): Partial<ActionItem>[]
{
    return [
        {
            id: "ai-1",
            content: "Review design spec",
            status: "not-started",
            priority: "high",
            tags: [],
        },
        {
            id: "ai-2",
            content: "Implement login flow",
            status: "in-progress",
            priority: "medium",
            tags: [],
        },
        {
            id: "ai-3",
            content: "Write unit tests",
            status: "done",
            priority: "low",
            tags: [],
        },
    ];
}

function makeOptions(
    overrides?: Partial<Omit<ActionItemsOptions, "container">>
): Omit<ActionItemsOptions, "container">
{
    return {
        items: makeItems() as ActionItem[],
        ...overrides,
    };
}

function createHandle(
    overrides?: Partial<Omit<ActionItemsOptions, "container">>
): ActionItemsHandle
{
    return createActionItems(container, makeOptions(overrides));
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "ai-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("ActionItems factory", () =>
{
    test("createActionItems_ValidOptions_ReturnsHandle", () =>
    {
        const handle = createHandle();
        expect(handle).toBeDefined();
        expect(typeof handle.addItem).toBe("function");
        expect(typeof handle.removeItem).toBe("function");
        expect(typeof handle.destroy).toBe("function");
        handle.destroy();
    });

    test("createActionItems_StringContainerId_Works", () =>
    {
        const handle = createActionItems("ai-test-container", makeOptions());
        expect(handle).toBeDefined();
        handle.destroy();
    });

    test("createActionItems_RendersRootElement", () =>
    {
        const handle = createHandle();
        expect(handle.getElement()).toBeInstanceOf(HTMLElement);
        expect(
            container.querySelector(".actionitems")
        ).not.toBeNull();
        handle.destroy();
    });
});

// ============================================================================
// ADD ITEM
// ============================================================================

describe("ActionItems addItem", () =>
{
    test("AddItem_IncreasesItemCount", () =>
    {
        const handle = createHandle({ items: [] });
        handle.addItem({
            content: "New task",
            status: "not-started",
        });
        expect(handle.getItems().length).toBe(1);
        handle.destroy();
    });

    test("AddItem_ReturnsNewItem", () =>
    {
        const handle = createHandle({ items: [] });
        const item = handle.addItem({
            content: "New task",
            status: "not-started",
        });
        expect(item.content).toBe("New task");
        expect(item.id).toBeTruthy();
        handle.destroy();
    });
});

// ============================================================================
// REMOVE ITEM
// ============================================================================

describe("ActionItems removeItem", () =>
{
    test("RemoveItem_ValidId_DecreasesCount", () =>
    {
        const handle = createHandle();
        const before = handle.getItems().length;
        handle.removeItem("ai-1");
        expect(handle.getItems().length).toBe(before - 1);
        handle.destroy();
    });

    test("RemoveItem_InvalidId_NoChange", () =>
    {
        const handle = createHandle();
        const before = handle.getItems().length;
        handle.removeItem("nonexistent");
        expect(handle.getItems().length).toBe(before);
        handle.destroy();
    });
});

// ============================================================================
// UPDATE ITEM
// ============================================================================

describe("ActionItems updateItem", () =>
{
    test("UpdateItem_ChangesContent", () =>
    {
        const handle = createHandle();
        handle.updateItem("ai-1", { content: "Updated task" });
        const item = handle.getItem("ai-1");
        expect(item?.content).toBe("Updated task");
        handle.destroy();
    });

    test("UpdateItem_ChangesStatus", () =>
    {
        const handle = createHandle();
        handle.updateItem("ai-1", { status: "done" });
        const item = handle.getItem("ai-1");
        expect(item?.status).toBe("done");
        handle.destroy();
    });
});

// ============================================================================
// GET ITEMS
// ============================================================================

describe("ActionItems getItems", () =>
{
    test("GetItems_ReturnsAllItems", () =>
    {
        const handle = createHandle();
        expect(handle.getItems().length).toBe(3);
        handle.destroy();
    });

    test("GetItem_ValidId_ReturnsItem", () =>
    {
        const handle = createHandle();
        const item = handle.getItem("ai-2");
        expect(item).not.toBeNull();
        expect(item?.content).toBe("Implement login flow");
        handle.destroy();
    });

    test("GetItem_InvalidId_ReturnsNull", () =>
    {
        const handle = createHandle();
        expect(handle.getItem("nonexistent")).toBeNull();
        handle.destroy();
    });

    test("GetItemsByStatus_ReturnsFilteredItems", () =>
    {
        const handle = createHandle();
        const done = handle.getItemsByStatus("done");
        expect(done.length).toBe(1);
        expect(done[0].content).toBe("Write unit tests");
        handle.destroy();
    });
});

// ============================================================================
// ASSIGNEE
// ============================================================================

describe("ActionItems assignee", () =>
{
    test("SetAssignee_SetsPersonOnItem", () =>
    {
        const handle = createHandle();
        const person: ActionItemPerson = {
            id: "p1",
            name: "Alice",
        };
        handle.setAssignee("ai-1", person);
        const item = handle.getItem("ai-1");
        expect(item?.assignee?.name).toBe("Alice");
        handle.destroy();
    });

    test("SetAssignee_Undefined_ClearsAssignee", () =>
    {
        const handle = createHandle();
        handle.setAssignee("ai-1", { id: "p1", name: "Alice" });
        handle.setAssignee("ai-1", undefined);
        const item = handle.getItem("ai-1");
        expect(item?.assignee).toBeUndefined();
        handle.destroy();
    });
});

// ============================================================================
// SELECTION
// ============================================================================

describe("ActionItems selection", () =>
{
    test("GetSelectedIds_InitiallyEmpty", () =>
    {
        const handle = createHandle();
        expect(handle.getSelectedIds().length).toBe(0);
        handle.destroy();
    });

    test("SetSelection_SetsSelectedIds", () =>
    {
        const handle = createHandle();
        handle.setSelection(["ai-1", "ai-2"]);
        expect(handle.getSelectedIds().length).toBe(2);
        handle.destroy();
    });

    test("ClearSelection_EmptiesSelection", () =>
    {
        const handle = createHandle();
        handle.setSelection(["ai-1"]);
        handle.clearSelection();
        expect(handle.getSelectedIds().length).toBe(0);
        handle.destroy();
    });
});

// ============================================================================
// EXPORT / IMPORT
// ============================================================================

describe("ActionItems export/import", () =>
{
    test("ExportJSON_ReturnsValidJSON", () =>
    {
        const handle = createHandle();
        const json = handle.export("json");
        const parsed = JSON.parse(json);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.length).toBe(3);
        handle.destroy();
    });

    test("ExportMarkdown_ReturnsString", () =>
    {
        const handle = createHandle();
        const md = handle.export("markdown");
        expect(typeof md).toBe("string");
        expect(md.length).toBeGreaterThan(0);
        handle.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("ActionItems destroy", () =>
{
    test("Destroy_RemovesFromContainer", () =>
    {
        const handle = createHandle();
        handle.destroy();
        expect(
            container.querySelector(".actionitems")
        ).toBeNull();
    });

    test("Destroy_CalledTwice_IsIdempotent", () =>
    {
        const handle = createHandle();
        handle.destroy();
        expect(() => handle.destroy()).not.toThrow();
    });
});

// ============================================================================
// ADR-128 — CategorizedDataInlineToolbar pattern
// ============================================================================

describe("ActionItems CategorizedDataInlineToolbar (ADR-128)", () =>
{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    let createInlineToolbarMock:
        ((opts: Record<string, unknown>) => unknown) | undefined;

    beforeEach(() =>
    {
        createInlineToolbarMock = vi.fn((_opts: Record<string, unknown>) => ({
            setItemActive: vi.fn(),
            destroy: vi.fn(),
        }));
        win.createInlineToolbar = createInlineToolbarMock;
    });

    afterEach(() =>
    {
        delete win.createInlineToolbar;
    });

    test("ShowInlineToolbar_DefaultFalse_NoToolbarSlot", () =>
    {
        const handle = createHandle();
        expect(
            container.querySelector(".actionitems-header-toolbar")
        ).toBeNull();
        handle.destroy();
    });

    test("ShowInlineToolbar_True_FactoryAvailable_SlotPresent", () =>
    {
        const handle = createHandle({ showInlineToolbar: true });
        expect(
            container.querySelector(".actionitems-header-toolbar")
        ).not.toBeNull();
        expect(createInlineToolbarMock).toHaveBeenCalled();
        handle.destroy();
    });

    test("ShowInlineToolbar_True_NoFactory_WarnsAndSkips", () =>
    {
        delete win.createInlineToolbar;
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => { });
        let handle: ActionItemsHandle | null = null;
        expect(() =>
        {
            handle = createHandle({ showInlineToolbar: true });
        }).not.toThrow();
        expect(
            container.querySelector(".actionitems-header-toolbar")
        ).toBeNull();
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
        handle?.destroy();
    });

    function getRenderedTitles(): string[]
    {
        const nodes = container.querySelectorAll(
            ".actionitems-section .actionitems-content"
        );
        const titles: string[] = [];
        nodes.forEach((n) =>
        {
            const t = n.textContent;
            if (t) { titles.push(t); }
        });
        return titles;
    }

    function makeAlphaItems(): Partial<ActionItem>[]
    {
        // Two sections; titles intentionally not in alpha order.
        return [
            {
                id: "a-1", content: "Charlie task",
                status: "not-started", priority: "high", order: 1,
            },
            {
                id: "a-2", content: "Alpha task",
                status: "not-started", priority: "medium", order: 2,
            },
            {
                id: "a-3", content: "Bravo task",
                status: "not-started", priority: "low", order: 3,
            },
            {
                id: "a-4", content: "Yankee task",
                status: "in-progress", priority: "high", order: 4,
            },
            {
                id: "a-5", content: "Xray task",
                status: "in-progress", priority: "low", order: 5,
            },
        ];
    }

    // ADR-128 amended: alpha sort lives in the primary `setSort` dropdown
    // via the "alpha-asc" / "alpha-desc" SortOption values. The InlineToolbar
    // exposes only expand-all / collapse-all to avoid duplicating the dropdown.

    test("SetSort_AlphaAsc_SortsItemsWithinSections", () =>
    {
        const handle = createActionItems(container, {
            items: makeAlphaItems() as ActionItem[],
        });
        handle.setSort("alpha-asc");
        const titles = getRenderedTitles();
        expect(titles).toEqual([
            "Alpha task", "Bravo task", "Charlie task",
            "Xray task", "Yankee task",
        ]);
        handle.destroy();
    });

    test("SetSort_AlphaDesc_SortsItemsZtoA", () =>
    {
        const handle = createActionItems(container, {
            items: makeAlphaItems() as ActionItem[],
        });
        handle.setSort("alpha-desc");
        const titles = getRenderedTitles();
        expect(titles).toEqual([
            "Charlie task", "Bravo task", "Alpha task",
            "Yankee task", "Xray task",
        ]);
        handle.destroy();
    });

    test("SetSort_AlphaAsc_DoesNotChangeSectionOrder", () =>
    {
        const handle = createActionItems(container, {
            items: makeAlphaItems() as ActionItem[],
        });
        handle.setSort("alpha-asc");
        // Section order is fixed: not-started → in-progress → done
        const sectionEls = container.querySelectorAll(
            ".actionitems-section"
        );
        const statuses = Array.from(sectionEls).map(
            (el) => el.getAttribute("data-status")
        );
        expect(statuses[0]).toBe("not-started");
        expect(statuses[1]).toBe("in-progress");
        handle.destroy();
    });

    test("Toolbar_OnlyExpandAndCollapseButtons", () =>
    {
        // ADR-128 amended: toolbar exposes only expand-all + collapse-all.
        // Sort buttons live in the dropdown, not the InlineToolbar.
        createHandle({ showInlineToolbar: true });
        // The mock factory was called exactly once with two non-separator items.
        expect(createInlineToolbarMock).toHaveBeenCalledTimes(1);
        const opts = (createInlineToolbarMock as unknown as
            { mock: { calls: [Record<string, unknown>][] } }).mock.calls[0][0];
        const items = opts.items as Array<{ id: string; type?: string }>;
        const ids = items.map((i) => i.id);
        expect(ids).toContain("ai-expand-all");
        expect(ids).toContain("ai-collapse-all");
        expect(ids).not.toContain("ai-sort-asc");
        expect(ids).not.toContain("ai-sort-desc");
    });

    test("ExpandAll_FiresOnCollapseStateChange_AllExpanded", () =>
    {
        const cb = vi.fn();
        const handle = createHandle({
            initialCollapsed: "all",
            onCollapseStateChange: cb,
        });
        handle.expandAll();
        expect(cb).toHaveBeenCalledWith("all-expanded");
        handle.destroy();
    });

    test("CollapseAll_FiresOnCollapseStateChange_AllCollapsed", () =>
    {
        const cb = vi.fn();
        const handle = createHandle({ onCollapseStateChange: cb });
        handle.collapseAll();
        expect(cb).toHaveBeenCalledWith("all-collapsed");
        handle.destroy();
    });
});
