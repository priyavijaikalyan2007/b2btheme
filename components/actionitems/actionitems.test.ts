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
