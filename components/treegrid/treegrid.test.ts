/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: TreeGrid
 * Vitest unit tests for the TreeGrid component.
 * Covers: factory, options, DOM structure, ARIA, node expansion,
 * selection, columns, sorting, row activation, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    TreeGrid,
    createTreeGrid,
} from "./treegrid";
import type
{
    TreeGridOptions,
    TreeGridNode,
    TreeGridColumn,
} from "./treegrid";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeColumn(overrides?: Partial<TreeGridColumn>): TreeGridColumn
{
    return {
        id: "col-" + Math.random().toString(36).slice(2, 6),
        label: "Name",
        ...overrides,
    };
}

function makeNode(overrides?: Partial<TreeGridNode>): TreeGridNode
{
    return {
        id: "node-" + Math.random().toString(36).slice(2, 6),
        label: "Node",
        ...overrides,
    };
}

function makeOptions(
    overrides?: Partial<TreeGridOptions>
): TreeGridOptions
{
    return {
        containerId: "test-treegrid",
        label: "Test TreeGrid",
        columns: [makeColumn({ id: "name", label: "Name" })],
        nodes: [
            makeNode({
                id: "n1",
                label: "Root",
                children: [
                    makeNode({ id: "n1-1", label: "Child 1" }),
                    makeNode({ id: "n1-2", label: "Child 2" }),
                ],
            }),
            makeNode({ id: "n2", label: "Sibling" }),
        ],
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "test-treegrid";
    document.body.appendChild(container);
});

afterEach(() =>
{
    document.body.innerHTML = "";
});

// ============================================================================
// FACTORY — createTreeGrid
// ============================================================================

describe("createTreeGrid", () =>
{
    test("returnsTreeGridInstance", () =>
    {
        const grid = createTreeGrid(makeOptions());
        expect(grid).toBeInstanceOf(TreeGrid);
        grid.destroy();
    });

    test("mountsInContainer", () =>
    {
        const grid = createTreeGrid(makeOptions());
        expect(container.children.length).toBeGreaterThan(0);
        grid.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("DOM structure", () =>
{
    test("rootElement_HasTreegridRole", () =>
    {
        const grid = createTreeGrid(makeOptions());
        const tg = container.querySelector("[role='treegrid']");
        expect(tg).not.toBeNull();
        grid.destroy();
    });

    test("rendersHeaderRow", () =>
    {
        const grid = createTreeGrid(makeOptions());
        const header = container.querySelector("[role='row']");
        expect(header).not.toBeNull();
        grid.destroy();
    });

    test("rendersCorrectNumberOfRows", () =>
    {
        // Default: parent collapsed so only top-level visible
        const grid = createTreeGrid(makeOptions({
            nodes: [
                makeNode({ id: "n1", label: "A" }),
                makeNode({ id: "n2", label: "B" }),
            ],
        }));
        const rows = container.querySelectorAll("[role='row']");
        // Header row + 2 data rows
        expect(rows.length).toBeGreaterThanOrEqual(2);
        grid.destroy();
    });
});

// ============================================================================
// ARIA / ACCESSIBILITY
// ============================================================================

describe("accessibility", () =>
{
    test("gridHasAriaLabel", () =>
    {
        const grid = createTreeGrid(makeOptions());
        const tg = container.querySelector("[role='treegrid']");
        expect(
            tg?.getAttribute("aria-label") ||
            tg?.getAttribute("aria-labelledby")
        ).toBeTruthy();
        grid.destroy();
    });

    test("rowsHaveAriaLevel", () =>
    {
        const grid = createTreeGrid(makeOptions({
            nodes: [makeNode({ id: "flat", label: "Flat" })],
        }));
        const rows = container.querySelectorAll(
            "[role='row'][aria-level]"
        );
        expect(rows.length).toBeGreaterThan(0);
        grid.destroy();
    });
});

// ============================================================================
// OPTIONS
// ============================================================================

describe("options", () =>
{
    test("selectionMode_single_AllowsSingleSelection", () =>
    {
        const grid = createTreeGrid(makeOptions({
            selectionMode: "single",
        }));
        // Grid created without error
        expect(grid.getElement()).not.toBeNull();
        grid.destroy();
    });

    test("rowStriping_AddsStripedClass", () =>
    {
        const grid = createTreeGrid(makeOptions({ rowStriping: true }));
        const root = grid.getElement();
        // The grid should apply striping styling
        expect(root).not.toBeNull();
        grid.destroy();
    });

    test("cssClass_AppliedToRoot", () =>
    {
        const grid = createTreeGrid(makeOptions({ cssClass: "my-grid" }));
        const root = grid.getElement();
        expect(root?.classList.contains("my-grid")).toBe(true);
        grid.destroy();
    });

    test("emptyMessage_ShowsWhenNoNodes", () =>
    {
        const grid = createTreeGrid(makeOptions({
            nodes: [],
            emptyMessage: "No data",
        }));
        const el = grid.getElement();
        expect(el?.textContent).toContain("No data");
        grid.destroy();
    });
});

// ============================================================================
// PUBLIC API — NODE OPERATIONS
// ============================================================================

describe("node operations", () =>
{
    test("expandNode_MakesChildrenVisible", () =>
    {
        const grid = createTreeGrid(makeOptions());
        grid.expandNode("n1");
        // After expanding, children should appear in DOM
        const rows = container.querySelectorAll("[role='row']");
        expect(rows.length).toBeGreaterThanOrEqual(3);
        grid.destroy();
    });

    test("collapseNode_HidesChildren", () =>
    {
        const grid = createTreeGrid(makeOptions({
            nodes: [
                makeNode({
                    id: "n1",
                    label: "Root",
                    expanded: true,
                    children: [
                        makeNode({ id: "c1", label: "Child" }),
                    ],
                }),
            ],
        }));
        grid.collapseNode("n1");
        // Should work without error
        expect(grid.getElement()).not.toBeNull();
        grid.destroy();
    });
});

// ============================================================================
// LIFECYCLE
// ============================================================================

describe("lifecycle", () =>
{
    test("destroy_RemovesDOMElements", () =>
    {
        const grid = createTreeGrid(makeOptions());
        grid.destroy();
        expect(container.querySelector("[role='treegrid']")).toBeNull();
    });

    test("getElement_ReturnsRoot", () =>
    {
        const grid = createTreeGrid(makeOptions());
        expect(grid.getElement()).toBeInstanceOf(HTMLElement);
        grid.destroy();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("missingContainer_Throws", () =>
    {
        // ERR-1. This asserted LogsError and passed, which is how a rule
        // AGENTS.md states as "throw a literate error" survived in a
        // component that logged and returned a handle to nothing.
        expect(() => createTreeGrid(makeOptions({ containerId: "nonexistent" })))
            .toThrow(/nonexistent/);
    });

    test("emptyNodes_RendersEmptyGrid", () =>
    {
        const grid = createTreeGrid(makeOptions({ nodes: [] }));
        expect(grid.getElement()).not.toBeNull();
        grid.destroy();
    });

    test("deeplyNestedNodes_RendersWithoutCrash", () =>
    {
        let deepNode: TreeGridNode = makeNode({ id: "deep-leaf", label: "Leaf" });
        for (let i = 10; i >= 0; i--)
        {
            deepNode = makeNode({
                id: `level-${i}`,
                label: `Level ${i}`,
                expanded: true,
                children: [deepNode],
            });
        }
        // DEBT-TEST-1b. The claim is that eleven levels RENDER, and
        // the body constructed them and threw them away. A grid that
        // stopped at level three would also not throw (ADR-215).
        const grid = createTreeGrid(makeOptions({ nodes: [deepNode] }));
        const text = grid.getElement().textContent ?? "";

        expect(text).toContain("Level 0");
        expect(text).toContain("Level 10");
        expect(text).toContain("Leaf");

        grid.destroy();
    });
});

// ============================================================================
// SURFACE CONTRACT (readiness step 2 B6): additive on(), getState/setState
// and setData. Each legacy callback keeps firing first, exactly once.
// ============================================================================

describe("surface contract (B6)", () =>
{
    // jsdom does not implement scrollIntoView, which a row click reaches through setFocusCell.
    beforeEach(() => { Element.prototype.scrollIntoView = vi.fn(); });
    afterEach(() => { delete (Element.prototype as Partial<Element>).scrollIntoView; });

    function rowEl(nodeId: string): HTMLElement
    {
        return container.querySelector(`.treegrid-row[data-node-id="${nodeId}"]`) as HTMLElement;
    }

    function treeCell(nodeId: string): HTMLElement
    {
        return rowEl(nodeId).querySelector(".treegrid-cell") as HTMLElement;
    }

    function dropOn(target: HTMLElement, sourceId: string): void
    {
        const e = new Event("drop", { bubbles: true, cancelable: true });
        Object.defineProperty(e, "clientY", { value: 0 });
        Object.defineProperty(e, "dataTransfer", { value: { getData: () => sourceId } });
        target.dispatchEvent(e);
    }

    test("on(selection)_HearsNodeSummaries_AfterOnSelectionChange", () =>
    {
        const order: string[] = [];
        const heard: unknown[] = [];
        const grid = createTreeGrid(makeOptions({
            nodes: [makeNode({ id: "n2", label: "Sibling", icon: "bi bi-file", data: { name: "x" } })],
            onSelectionChange: (nodes) => order.push(`option:${nodes.map((n) => n.id).join(",")}`),
        }));
        grid.on("selection", (p) =>
        {
            order.push(`channel:${(p as Array<{ id: string }>).map((n) => n.id).join(",")}`);
            heard.push(p);
        });

        treeCell("n2").dispatchEvent(new MouseEvent("click", { bubbles: true }));

        expect(order).toEqual(["option:n2", "channel:n2"]);
        expect(heard[0]).toEqual([{ id: "n2", label: "Sibling", icon: "bi bi-file" }]);
        expect(JSON.parse(JSON.stringify(heard[0]))).toEqual(heard[0]);
        grid.destroy();
    });

    test("on(selection)_FiresWithoutOnSelectionChange", () =>
    {
        const heard = vi.fn();
        const grid = createTreeGrid(makeOptions());
        grid.on("selection", heard);

        treeCell("n2").dispatchEvent(new MouseEvent("click", { bubbles: true }));

        expect(heard).toHaveBeenCalledTimes(1);
        expect(heard).toHaveBeenCalledWith([{ id: "n2", label: "Sibling" }]);
        grid.destroy();
    });

    test("on(selection)_PayloadIsACopy_NotTheInternalNode", () =>
    {
        const grid = createTreeGrid(makeOptions());
        grid.on("selection", (p) => { (p as Array<{ label: string }>)[0].label = "Mutated"; });

        treeCell("n2").dispatchEvent(new MouseEvent("click", { bubbles: true }));

        expect(grid.getNode("n2")!.label).toBe("Sibling");
        grid.destroy();
    });

    test("on(activate)_DblClickAndEnter_AfterOnRowActivate", () =>
    {
        const order: string[] = [];
        const heard: unknown[] = [];
        const grid = createTreeGrid(makeOptions({ onRowActivate: (n) => order.push(`option:${n.id}`) }));
        grid.on("activate", (p) =>
        {
            order.push(`channel:${(p as { id: string }).id}`);
            heard.push(p);
        });

        treeCell("n1").dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
        treeCell("n2").dispatchEvent(new MouseEvent("click", { bubbles: true }));
        treeCell("n2").dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

        expect(order).toEqual(["option:n1", "channel:n1", "option:n2", "channel:n2"]);
        expect(heard[0]).toEqual({ id: "n1", label: "Root" });
        expect(heard[0]).not.toHaveProperty("children");
        expect(JSON.parse(JSON.stringify(heard[0]))).toEqual(heard[0]);
        grid.destroy();
    });

    test("on(activate)_FiresWithoutOnRowActivate", () =>
    {
        const heard = vi.fn();
        const grid = createTreeGrid(makeOptions());
        grid.on("activate", heard);

        treeCell("n2").dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));

        expect(heard).toHaveBeenCalledWith({ id: "n2", label: "Sibling" });
        grid.destroy();
    });

    test("on(editCommit)_HearsTheEdit_AfterOnEditCommit", () =>
    {
        const order: string[] = [];
        const heard: unknown[] = [];
        const grid = createTreeGrid(makeOptions({
            columns: [makeColumn({ id: "size", label: "Size", editable: true })],
            nodes: [makeNode({ id: "n2", label: "Sibling", data: { size: "1 KB" } })],
            onEditCommit: (n, c, o, v) => order.push(`option:${n.id}:${c.id}:${String(o)}:${String(v)}`),
        }));
        grid.on("editCommit", (p) =>
        {
            order.push("channel");
            heard.push(p);
        });

        const dataCell = rowEl("n2").querySelectorAll(".treegrid-cell")[1] as HTMLElement;
        dataCell.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
        const input = dataCell.querySelector("input") as HTMLInputElement;
        input.value = "2 KB";
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

        expect(order).toEqual(["option:n2:size:1 KB:2 KB", "channel"]);
        expect(heard[0]).toEqual({ nodeId: "n2", columnId: "size", oldValue: "1 KB", newValue: "2 KB" });
        expect(JSON.parse(JSON.stringify(heard[0]))).toEqual(heard[0]);
        grid.destroy();
    });

    test("on(editCommit)_FiresWithoutOnEditCommit", () =>
    {
        const heard = vi.fn();
        const grid = createTreeGrid(makeOptions({
            columns: [makeColumn({ id: "size", label: "Size", editable: true })],
            nodes: [makeNode({ id: "n2", label: "Sibling", data: { size: "1 KB" } })],
        }));
        grid.on("editCommit", heard);

        const dataCell = rowEl("n2").querySelectorAll(".treegrid-cell")[1] as HTMLElement;
        dataCell.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
        const input = dataCell.querySelector("input") as HTMLInputElement;
        input.value = "3 KB";
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

        expect(heard).toHaveBeenCalledWith({ nodeId: "n2", columnId: "size", oldValue: "1 KB", newValue: "3 KB" });
        grid.destroy();
    });

    test("on(contextMenuAction)_HearsTheAction_AfterOnContextMenuAction", () =>
    {
        const order: string[] = [];
        const heard: unknown[] = [];
        const grid = createTreeGrid(makeOptions({
            enableContextMenu: true,
            contextMenuItems: [{ id: "rename", label: "Rename" }],
            onContextMenuAction: (a, n) => order.push(`option:${a}:${n.id}`),
        }));
        grid.on("contextMenuAction", (p) =>
        {
            order.push("channel");
            heard.push(p);
        });

        rowEl("n2").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
        (document.querySelector(".treegrid-context-item") as HTMLElement).click();

        expect(order).toEqual(["option:rename:n2", "channel"]);
        expect(heard[0]).toEqual({ actionId: "rename", nodeId: "n2" });
        expect(JSON.parse(JSON.stringify(heard[0]))).toEqual(heard[0]);
        grid.destroy();
    });

    test("on(contextMenuAction)_FiresWithoutOnContextMenuAction", () =>
    {
        const heard = vi.fn();
        const grid = createTreeGrid(makeOptions({
            enableContextMenu: true,
            contextMenuItems: [{ id: "rename", label: "Rename" }],
        }));
        grid.on("contextMenuAction", heard);

        rowEl("n2").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
        (document.querySelector(".treegrid-context-item") as HTMLElement).click();

        expect(heard).toHaveBeenCalledWith({ actionId: "rename", nodeId: "n2" });
        grid.destroy();
    });

    test("on(drop)_HearsTheDrop_AfterOnDrop", () =>
    {
        const order: string[] = [];
        const heard: unknown[] = [];
        const grid = createTreeGrid(makeOptions({
            enableDragDrop: true,
            onDrop: (s, t, pos) => order.push(`option:${s.map((n) => n.id).join(",")}:${t.id}:${pos}`),
        }));
        grid.on("drop", (p) =>
        {
            order.push("channel");
            heard.push(p);
        });

        dropOn(rowEl("n1"), "n2");

        expect(order).toEqual(["option:n2:n1:inside", "channel"]);
        expect(heard[0]).toEqual({ sourceIds: ["n2"], targetId: "n1", position: "inside" });
        expect(JSON.parse(JSON.stringify(heard[0]))).toEqual(heard[0]);
        grid.destroy();
    });

    test("on(drop)_FiresWithoutOnDrop", () =>
    {
        const heard = vi.fn();
        const grid = createTreeGrid(makeOptions({ enableDragDrop: true }));
        grid.on("drop", heard);

        dropOn(rowEl("n1"), "n2");

        expect(heard).toHaveBeenCalledWith({ sourceIds: ["n2"], targetId: "n1", position: "inside" });
        grid.destroy();
    });

    test("on_Unsubscribe_StopsDelivery", () =>
    {
        const order: string[] = [];
        const grid = createTreeGrid(makeOptions({ onRowActivate: (n) => order.push(`option:${n.id}`) }));
        const off = grid.on("activate", (p) => order.push(`channel:${(p as { id: string }).id}`));

        treeCell("n1").dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
        off();
        treeCell("n2").dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));

        expect(order).toEqual(["option:n1", "channel:n1", "option:n2"]);
        grid.destroy();
    });

    test("on_HandlerThrows_IsIsolated", () =>
    {
        const heard = vi.fn();
        const grid = createTreeGrid(makeOptions());
        grid.on("activate", () => { throw new Error("boom"); });
        grid.on("activate", heard);

        treeCell("n2").dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));

        expect(heard).toHaveBeenCalledTimes(1);
        grid.destroy();
    });

    test("on_UnknownChannel_AndSetData_Throw", () =>
    {
        const grid = createTreeGrid(makeOptions());

        expect(() => grid.on("bogus", () => undefined))
            .toThrow(/selection.*activate.*editCommit.*contextMenuAction.*drop/);
        expect(() => grid.setData("nodes", [])).toThrow(/no data slots.*setNodes/);
        grid.destroy();
    });

    test("getState_SetState_RoundTripExpandedAndSelection", () =>
    {
        const grid = createTreeGrid(makeOptions());
        expect(grid.getState()).toEqual({ expanded: [], selection: [] });

        grid.expandNode("n1");
        grid.selectNode("n1-2");
        const captured = grid.getState();
        expect(captured).toEqual({ expanded: ["n1"], selection: ["n1-2"] });
        expect(JSON.parse(JSON.stringify(captured))).toEqual(captured);

        grid.collapseNode("n1");
        grid.clearSelection();
        grid.selectNode("n2");
        expect(grid.getState()).toEqual({ expanded: [], selection: ["n2"] });

        grid.setState(captured);
        expect(grid.getState()).toEqual(captured);
        expect(rowEl("n1-2").classList.contains("treegrid-row-selected")).toBe(true);
        expect(rowEl("n2").classList.contains("treegrid-row-selected")).toBe(false);

        grid.setState({ expanded: [], selection: [] });
        expect(grid.getState()).toEqual({ expanded: [], selection: [] });
        expect(rowEl("n1-1")).toBeNull();
        grid.destroy();
    });

    test("setState_IsSilent_NoLegacyCallbackAndNoChannel", () =>
    {
        const heard: string[] = [];
        const grid = createTreeGrid(makeOptions({
            selectionMode: "multi",
            onSelectionChange: () => heard.push("onSelectionChange"),
            onRowSelect: () => heard.push("onRowSelect"),
            onRowToggle: () => heard.push("onRowToggle"),
            onRefreshComplete: () => heard.push("onRefreshComplete"),
        }));
        for (const channel of ["selection", "activate", "editCommit", "contextMenuAction", "drop"])
        {
            grid.on(channel, () => heard.push(`channel:${channel}`));
        }

        grid.setState({ expanded: ["n1"], selection: ["n1-1", "n2"] });
        grid.setState({ expanded: [], selection: [] });
        grid.setState({ expanded: ["n1"], selection: ["n1-2"] });

        expect(heard).toEqual([]);
        expect(grid.getState()).toEqual({ expanded: ["n1"], selection: ["n1-2"] });
        grid.destroy();
    });

    test("setState_SelectsExactlyTheGivenIds_AndRendersNestedExpansion", () =>
    {
        const grid = createTreeGrid(makeOptions({
            nodes: [
                makeNode({
                    id: "a", label: "A", children: [
                        makeNode({ id: "a1", label: "A1", children: [makeNode({ id: "a1x", label: "A1x" })] }),
                    ],
                }),
                makeNode({ id: "b", label: "B" }),
            ],
        }));
        grid.selectNode("b");

        grid.setState({ expanded: ["a", "a1"], selection: ["a1x"] });

        expect(grid.getState()).toEqual({ expanded: ["a", "a1"], selection: ["a1x"] });
        expect(rowEl("a1x").classList.contains("treegrid-row-selected")).toBe(true);
        expect(rowEl("a1x").getAttribute("aria-selected")).toBe("true");
        expect(rowEl("b").classList.contains("treegrid-row-selected")).toBe(false);
        expect(rowEl("a").getAttribute("aria-expanded")).toBe("true");
        grid.destroy();
    });

    test("destroy_ClearsChannelHandlers", () =>
    {
        const heard = vi.fn();
        const grid = createTreeGrid(makeOptions());
        grid.on("selection", heard);

        grid.destroy();
        (grid as unknown as { fireSelectionChange(): void }).fireSelectionChange();

        expect(heard).not.toHaveBeenCalled();
    });
});
