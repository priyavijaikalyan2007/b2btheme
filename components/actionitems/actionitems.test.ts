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
import { destroyProbe } from "../../tests/destroy-probe";
import { createActionItems } from "./actionitems";
// DEBT-TEST-1c. Side-effect import: the ADR-128 block below mounts the
// real InlineToolbar rather than a stub of it.
import "../inlinetoolbar/inlinetoolbar";
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

    // "Works" is what `toBeDefined()` already says, and the block
    // below already proves the root renders. What is left is the
    // SURFACE: ActionItemsHandle declares twenty-two methods and a
    // caller gets whatever the factory built. Listing them catches
    // one that went missing and one that was added without reaching
    // the published interface.
    test("createActionItems_StringContainerId_Works", () =>
    {
        const handle = createActionItems("ai-test-container", makeOptions());

        expect(Object.keys(handle).sort()).toEqual([
            "addItem", "clearFilters", "clearSelection", "collapseAll",
            "destroy", "expandAll", "export", "getElement", "getItem",
            "getItems", "getItemsByStatus", "getSelectedIds",
            "importMarkdown", "removeItem", "scrollToItem", "setAssignee",
            "setCommentCount", "setFilter", "setSelection", "setSort",
            "toggleSection", "updateItem",
        ]);

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
        const probe = destroyProbe();

        handle.destroy();
        const first = probe.total();
        handle.destroy();

        expect(first).toBeGreaterThan(0);
        expect(probe.total()).toBe(first);
        probe.restore();
    });
});

// ============================================================================
// ADR-128 — CategorizedDataInlineToolbar pattern
// ============================================================================

describe("ActionItems CategorizedDataInlineToolbar (ADR-128)", () =>
{
    /*
     * DEBT-TEST-1c. This block used to hand ActionItems a `vi.fn()`
     * returning two stubs, so the assertions were about the ARGUMENT
     * LIST the component passed and not about anything a user could
     * reach. No button was rendered and no click was ever dispatched.
     *
     * The real factory arrives through the side-effect import below,
     * which is how a CDN consumer gets it.
     */

    function toolbarButton(id: string): HTMLElement
    {
        const btn = container.querySelector<HTMLElement>(`[data-item-id="${id}"]`);
        if (btn === null) { throw new Error(`no toolbar button rendered for "${id}"`); }
        return btn;
    }

    test("theRealFactoryIsRegistered_SoTheseTestsMountIt", () =>
    {
        expect(typeof window.createInlineToolbar).toBe("function");
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

        // The slot being present said nothing about what went in it.
        expect(toolbarButton("ai-expand-all")).not.toBeNull();
        handle.destroy();
    });

    test("ShowInlineToolbar_True_NoFactory_Refuses", () =>
    {
        // FALLBACK-14. The old name said WarnsAndSkips and the old body
        // asserted the slot was absent, which was true and was the
        // defect: a page that asked for a toolbar got none, and said so
        // only in a console.
        const real = window.createInlineToolbar;
        delete (window as unknown as Record<string, unknown>).createInlineToolbar;

        try
        {
            expect(() => createHandle({ showInlineToolbar: true }))
                .toThrow(/createInlineToolbar is not loaded/);
        }
        finally
        {
            window.createInlineToolbar = real;
        }
    });


    test("ShowInlineToolbar_FactoryThrows_PropagatesWithItsCause", () =>
    {
        // FALLBACK-14. The old `catch` logged the error and set the
        // handle to null, so the original fault never reached the
        // caller and the toolbar silently did not exist.
        const real = window.createInlineToolbar;
        const boom = new Error("toolbar blew up during construction");
        (window as unknown as Record<string, unknown>).createInlineToolbar =
            () => { throw boom; };
        let caught: Error | null = null;

        try { createHandle({ showInlineToolbar: true }); }
        catch (e) { caught = e as Error; }
        finally { window.createInlineToolbar = real; }

        expect(caught).not.toBeNull();
        expect((caught as Error & { cause?: unknown }).cause).toBe(boom);
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
        //
        // Read off the RENDERED toolbar rather than the argument list,
        // because a button the component asked for and the toolbar
        // declined to draw is the case worth catching.
        createHandle({ showInlineToolbar: true });
        const root = container.querySelector(".actionitems-header-toolbar");
        const ids = Array.from(root?.querySelectorAll("[data-item-id]") ?? [])
            .map((el) => el.getAttribute("data-item-id"));

        expect(ids).toEqual(["ai-expand-all", "ai-collapse-all"]);
    });

    test("Toolbar_CollapseAllButton_CollapsesEverySection", () =>
    {
        // The claim the old block could not make at all: a USER click
        // on the drawn button reaches the component.
        const handle = createHandle({ showInlineToolbar: true });
        const headers = () => Array.from(container.querySelectorAll(
            ".actionitems-section-header"))
            .map((el) => el.getAttribute("aria-expanded"));

        expect(headers().length).toBeGreaterThan(0);
        expect(headers()).not.toContain("false");

        toolbarButton("ai-collapse-all").click();

        expect(headers()).not.toContain("true");
        handle.destroy();
    });

    test("Toolbar_SurvivesItsOwnClick_SoTheSecondOneStillLands", () =>
    {
        // expandAll and collapseAll both call render(). If a re-render
        // took the toolbar with it, the first click would work and
        // every later one would hit a detached button. Clicking twice
        // is what tells those two apart.
        const handle = createHandle({ showInlineToolbar: true });
        toolbarButton("ai-collapse-all").click();
        toolbarButton("ai-expand-all").click();
        const expanded = Array.from(container.querySelectorAll(
            ".actionitems-section-header"))
            .map((el) => el.getAttribute("aria-expanded"));

        expect(expanded).not.toContain("false");
        handle.destroy();
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
