/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: TreeView / ConformanceGlue
 * 📜 PURPOSE: Mount fixture and channel triggers for the conformance gate.
 *    Fixtures live here rather than in the manifest because defaultOptions is
 *    shipped to consumers and must not carry placeholder content.
 * 🔗 RELATES: [[TreeView]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker treeview-conformance-glue

/** Minimal view of the handle, limited to what the triggers need. */
interface TreeLike
{
    setData(slot: string, value: unknown): void;
    selectNode(nodeId: string): void;
    expandNode(nodeId: string): void;
    getElement(): HTMLElement | null;
}

const FIXTURE_ROOTS = [
    {
        id: "fixture-root",
        label: "Root",
        kind: "folder",
        expanded: true,
        children: [{ id: "fixture-child", label: "Child", kind: "item" }],
    },
];

const LAZY_ROOTS = [{ id: "fixture-lazy", label: "Lazy", kind: "folder", children: null, lazy: true }];

/** Loads the fixture, so a trigger works whatever roots the mounting suite supplied. */
function withFixture(handle: Record<string, unknown>, roots: unknown): TreeLike
{
    const tree = handle as unknown as TreeLike;

    tree.setData("roots", roots);

    return tree;
}

/** Double-clicks a node's row, which is how a user activates it. */
function activate(tree: TreeLike, nodeId: string): boolean
{
    const row = tree.getElement()?.querySelector(`li[data-node-id="${nodeId}"] > .treeview-node-row`);

    row?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));

    return row !== null && row !== undefined;
}

/** Types into the search box; the component's debounce then runs its search. */
function typeSearch(tree: TreeLike, text: string): boolean
{
    const input = tree.getElement()?.querySelector<HTMLInputElement>(".treeview-search-input");

    if (!input) { return false; }

    input.value = text;
    input.dispatchEvent(new Event("input", { bubbles: true }));

    return true;
}

export const CONFORMANCE_GLUE =
{
    options: { roots: FIXTURE_ROOTS },

    /** Create-time props a provider request needs: a search box, and async search from the first node. */
    requestProps: { showSearch: true, searchAsyncThreshold: 1 },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const tree = withFixture(handle, FIXTURE_ROOTS);

        if (channel === "selection") { tree.selectNode("fixture-child"); return true; }

        if (channel === "activate") { return activate(tree, "fixture-child"); }

        return false;
    },

    /** Makes the component ask a provider (ADR-225): expand a lazy node, or search. */
    request: (
        request: string,
        handle: Record<string, unknown>): boolean =>
    {
        if (request === "loadChildren")
        {
            withFixture(handle, LAZY_ROOTS).expandNode("fixture-lazy");
            return true;
        }

        if (request === "search") { return typeSearch(withFixture(handle, FIXTURE_ROOTS), "Child"); }

        return false;
    },
};
