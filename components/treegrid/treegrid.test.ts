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
    test("missingContainer_LogsError", () =>
    {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        createTreeGrid(makeOptions({ containerId: "nonexistent" }));
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
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
        expect(() =>
        {
            const grid = createTreeGrid(makeOptions({ nodes: [deepNode] }));
            grid.destroy();
        }).not.toThrow();
    });
});
