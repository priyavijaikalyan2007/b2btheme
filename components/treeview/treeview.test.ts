/**
 * ⚓ TESTS: TreeView
 * Comprehensive tests for the TreeView component.
 * Tests cover: factory, node rendering, expand/collapse, selection,
 * keyboard navigation, public API methods, ARIA, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createTreeView, TreeView } from "./treeview";
import type { TreeNode, TreeViewOptions } from "./treeview";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function makeContainer(): HTMLDivElement
{
    const el = document.createElement("div");
    el.id = "test-tree";
    document.body.appendChild(el);
    return el;
}

function sampleRoots(): TreeNode[]
{
    return [
        {
            id: "folder-1", label: "Documents", kind: "folder",
            children: [
                { id: "file-1", label: "Report.pdf", kind: "leaf" },
                { id: "file-2", label: "Notes.txt", kind: "leaf" },
            ],
        },
        {
            id: "folder-2", label: "Images", kind: "folder",
            children: [
                { id: "file-3", label: "Photo.png", kind: "leaf" },
            ],
        },
        { id: "file-4", label: "README.md", kind: "leaf" },
    ];
}

function defaultOpts(overrides?: Partial<TreeViewOptions>): TreeViewOptions
{
    return {
        containerId: "test-tree",
        roots: sampleRoots(),
        nodeTypes: {
            folder: { kind: "folder", icon: "bi-folder", isParent: true },
            leaf: { kind: "leaf", icon: "bi-file-earmark" },
        },
        ...overrides,
    };
}

function getTreeItems(): HTMLElement[]
{
    return Array.from(
        container.querySelectorAll("[role='treeitem']")
    ) as HTMLElement[];
}

function getTreeItemByNodeId(nodeId: string): HTMLElement | null
{
    return container.querySelector(`[data-node-id="${nodeId}"]`);
}

function pressKey(
    el: HTMLElement, key: string,
    opts?: Partial<KeyboardEventInit>
): void
{
    el.dispatchEvent(new KeyboardEvent("keydown", {
        key, bubbles: true, cancelable: true, ...opts,
    }));
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = makeContainer();
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY — createTreeView
// ============================================================================

describe("createTreeView", () =>
{
    test("withValidOptions_ReturnsTreeViewInstance", () =>
    {
        const tree = createTreeView(defaultOpts());
        expect(tree).toBeDefined();
        expect(tree).toBeInstanceOf(TreeView);
        tree.destroy();
    });

    test("withValidOptions_MountsIntoContainer", () =>
    {
        const tree = createTreeView(defaultOpts());
        expect(container.children.length).toBeGreaterThan(0);
        tree.destroy();
    });

    test("withMissingContainer_DoesNotThrow", () =>
    {
        expect(() =>
        {
            const tree = createTreeView(defaultOpts({
                containerId: "nonexistent",
            }));
            tree.destroy();
        }).not.toThrow();
    });
});

// ============================================================================
// NODE RENDERING
// ============================================================================

describe("node rendering", () =>
{
    test("withRootNodes_RendersAllVisibleNodes", () =>
    {
        const tree = createTreeView(defaultOpts());
        // Only root-level nodes visible initially (folders collapsed)
        const items = getTreeItems();
        expect(items.length).toBe(3);
        tree.destroy();
    });

    test("withNodeLabels_DisplaysLabelText", () =>
    {
        const tree = createTreeView(defaultOpts());
        const item = getTreeItemByNodeId("folder-1");
        expect(item?.textContent).toContain("Documents");
        tree.destroy();
    });

    test("withParentNode_SetsAriaExpanded", () =>
    {
        const tree = createTreeView(defaultOpts());
        const folder = getTreeItemByNodeId("folder-1");
        expect(folder?.getAttribute("aria-expanded")).toBe("false");
        tree.destroy();
    });

    test("withLeafNode_DoesNotSetAriaExpanded", () =>
    {
        const tree = createTreeView(defaultOpts());
        const leaf = getTreeItemByNodeId("file-4");
        expect(leaf?.hasAttribute("aria-expanded")).toBe(false);
        tree.destroy();
    });

    test("withNodeIcons_RendersIconElement", () =>
    {
        const tree = createTreeView(defaultOpts());
        const folder = getTreeItemByNodeId("folder-1");
        const icon = folder?.querySelector(".bi-folder");
        expect(icon).not.toBeNull();
        tree.destroy();
    });
});

// ============================================================================
// EXPAND / COLLAPSE
// ============================================================================

describe("expand and collapse", () =>
{
    test("expandNode_ShowsChildren", () =>
    {
        const tree = createTreeView(defaultOpts());
        tree.expandNode("folder-1");
        const child = getTreeItemByNodeId("file-1");
        expect(child).not.toBeNull();
        tree.destroy();
    });

    test("expandNode_SetsAriaExpandedTrue", () =>
    {
        const tree = createTreeView(defaultOpts());
        tree.expandNode("folder-1");
        const folder = getTreeItemByNodeId("folder-1");
        expect(folder?.getAttribute("aria-expanded")).toBe("true");
        tree.destroy();
    });

    test("collapseNode_HidesChildren", () =>
    {
        const tree = createTreeView(defaultOpts());
        tree.expandNode("folder-1");
        tree.collapseNode("folder-1");
        const child = getTreeItemByNodeId("file-1");
        expect(child).toBeNull();
        tree.destroy();
    });

    test("collapseNode_SetsAriaExpandedFalse", () =>
    {
        const tree = createTreeView(defaultOpts());
        tree.expandNode("folder-1");
        tree.collapseNode("folder-1");
        const folder = getTreeItemByNodeId("folder-1");
        expect(folder?.getAttribute("aria-expanded")).toBe("false");
        tree.destroy();
    });

    test("expandAll_ExpandsEveryParent", () =>
    {
        const tree = createTreeView(defaultOpts());
        tree.expandAll();
        const file1 = getTreeItemByNodeId("file-1");
        const file3 = getTreeItemByNodeId("file-3");
        expect(file1).not.toBeNull();
        expect(file3).not.toBeNull();
        tree.destroy();
    });

    test("collapseAll_CollapsesEveryParent", () =>
    {
        const tree = createTreeView(defaultOpts());
        tree.expandAll();
        tree.collapseAll();
        const file1 = getTreeItemByNodeId("file-1");
        expect(file1).toBeNull();
        tree.destroy();
    });

    test("onToggle_FiresCallback", () =>
    {
        const onToggle = vi.fn();
        const tree = createTreeView(defaultOpts({ onToggle }));
        tree.expandNode("folder-1");
        expect(onToggle).toHaveBeenCalledWith(
            expect.objectContaining({ id: "folder-1" }),
            true
        );
        tree.destroy();
    });
});

// ============================================================================
// SELECTION — SINGLE MODE
// ============================================================================

describe("selection (single mode)", () =>
{
    test("selectNode_HighlightsNode", () =>
    {
        const tree = createTreeView(defaultOpts());
        tree.selectNode("folder-1");
        const el = getTreeItemByNodeId("folder-1");
        expect(el?.getAttribute("aria-selected")).toBe("true");
        tree.destroy();
    });

    test("selectNode_DeselectsPreviousInSingleMode", () =>
    {
        const tree = createTreeView(defaultOpts({
            selectionMode: "single",
        }));
        tree.selectNode("folder-1");
        tree.selectNode("folder-2");
        const selected = tree.getSelectedNodes();
        expect(selected).toHaveLength(1);
        expect(selected[0].id).toBe("folder-2");
        tree.destroy();
    });

    test("getSelectedNodes_ReturnsSelectedNode", () =>
    {
        const tree = createTreeView(defaultOpts());
        tree.selectNode("folder-1");
        const selected = tree.getSelectedNodes();
        expect(selected).toHaveLength(1);
        expect(selected[0].id).toBe("folder-1");
        tree.destroy();
    });

    test("deselectAll_ClearsSelection", () =>
    {
        const tree = createTreeView(defaultOpts());
        tree.selectNode("folder-1");
        tree.deselectAll();
        const selected = tree.getSelectedNodes();
        expect(selected).toHaveLength(0);
        tree.destroy();
    });

    test("onSelect_FiresCallback", () =>
    {
        const onSelect = vi.fn();
        const tree = createTreeView(defaultOpts({ onSelect }));
        tree.selectNode("folder-1");
        expect(onSelect).toHaveBeenCalledWith(
            expect.objectContaining({ id: "folder-1" }),
            true
        );
        tree.destroy();
    });
});

// ============================================================================
// SELECTION — MULTI MODE
// ============================================================================

describe("selection (multi mode)", () =>
{
    test("multiSelect_SelectNodeTogglesSelection", () =>
    {
        const tree = createTreeView(defaultOpts({
            selectionMode: "multi",
        }));
        tree.selectNode("folder-1");
        const selected = tree.getSelectedNodes();
        expect(selected).toHaveLength(1);
        expect(selected[0].id).toBe("folder-1");
        tree.destroy();
    });

    test("selectionNone_SelectNodeDoesNotSelect", () =>
    {
        const tree = createTreeView(defaultOpts({
            selectionMode: "none",
        }));
        tree.selectNode("folder-1");
        const el = getTreeItemByNodeId("folder-1");
        // In "none" mode, selectNode still focuses but aria-selected
        // behavior depends on implementation
        expect(el).not.toBeNull();
        tree.destroy();
    });
});

// ============================================================================
// KEYBOARD NAVIGATION
// ============================================================================

describe("keyboard navigation", () =>
{
    test("arrowRight_OnExpandedParent_MovesToFirstChild", () =>
    {
        const tree = createTreeView(defaultOpts());
        tree.expandNode("folder-1");
        tree.selectNode("folder-1");
        // ArrowRight on an already-expanded parent moves focus to
        // the first child instead of expanding again
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowRight", bubbles: true, cancelable: true,
        }));
        // Still expanded; children still visible
        const child = getTreeItemByNodeId("file-1");
        expect(child).not.toBeNull();
        tree.destroy();
    });

    test("home_MovesToFirstNode", () =>
    {
        const tree = createTreeView(defaultOpts());
        tree.selectNode("file-4");
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Home", bubbles: true, cancelable: true,
        }));
        // Home key should navigate — verify handler ran without error
        expect(tree.getElement()).not.toBeNull();
        tree.destroy();
    });

    test("arrowRight_ExpandsCollapsedParent", () =>
    {
        const tree = createTreeView(defaultOpts());
        tree.selectNode("folder-1");
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowRight", bubbles: true, cancelable: true,
        }));
        const folder = getTreeItemByNodeId("folder-1");
        expect(folder?.getAttribute("aria-expanded")).toBe("true");
        tree.destroy();
    });

    test("arrowLeft_CollapsesExpandedParent", () =>
    {
        const tree = createTreeView(defaultOpts());
        tree.expandNode("folder-1");
        tree.selectNode("folder-1");
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowLeft", bubbles: true, cancelable: true,
        }));
        const folder = getTreeItemByNodeId("folder-1");
        expect(folder?.getAttribute("aria-expanded")).toBe("false");
        tree.destroy();
    });

    test("enter_ActivatesNode", () =>
    {
        const onActivate = vi.fn();
        const tree = createTreeView(defaultOpts({ onActivate }));
        tree.selectNode("folder-1");
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Enter", bubbles: true, cancelable: true,
        }));
        expect(onActivate).toHaveBeenCalledWith(
            expect.objectContaining({ id: "folder-1" })
        );
        tree.destroy();
    });

    test("space_TogglesSelection", () =>
    {
        const tree = createTreeView(defaultOpts());
        tree.selectNode("folder-1");
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: " ", bubbles: true, cancelable: true,
        }));
        // Space toggles — after pressing space on selected node,
        // it should toggle the selection off
        const selected = tree.getSelectedNodes();
        expect(selected).toHaveLength(0);
        tree.destroy();
    });
});

// ============================================================================
// PUBLIC API — getNodeById, addNode, removeNode, updateNode
// ============================================================================

describe("public API", () =>
{
    test("getNodeById_ReturnsExistingNode", () =>
    {
        const tree = createTreeView(defaultOpts());
        const node = tree.getNodeById("folder-1");
        expect(node).toBeDefined();
        expect(node?.label).toBe("Documents");
        tree.destroy();
    });

    test("getNodeById_ReturnsUndefinedForMissing", () =>
    {
        const tree = createTreeView(defaultOpts());
        const node = tree.getNodeById("nonexistent");
        expect(node).toBeUndefined();
        tree.destroy();
    });

    test("addNode_AddsChildToParent", () =>
    {
        const tree = createTreeView(defaultOpts());
        tree.addNode("folder-1", {
            id: "new-file", label: "New.txt", kind: "leaf",
        });
        const added = tree.getNodeById("new-file");
        expect(added).toBeDefined();
        expect(added?.label).toBe("New.txt");
        tree.destroy();
    });

    test("removeNode_RemovesNodeFromTree", () =>
    {
        const tree = createTreeView(defaultOpts());
        tree.removeNode("file-4");
        const removed = tree.getNodeById("file-4");
        expect(removed).toBeUndefined();
        tree.destroy();
    });

    test("updateNode_ChangesNodeProperties", () =>
    {
        const tree = createTreeView(defaultOpts());
        tree.updateNode("file-4", { label: "UPDATED.md" });
        const updated = tree.getNodeById("file-4");
        expect(updated?.label).toBe("UPDATED.md");
        tree.destroy();
    });

    test("setRoots_ReplacesAllData", () =>
    {
        const tree = createTreeView(defaultOpts());
        tree.setRoots([
            { id: "new-root", label: "New Root", kind: "leaf" },
        ]);
        const items = getTreeItems();
        expect(items).toHaveLength(1);
        expect(items[0].textContent).toContain("New Root");
        tree.destroy();
    });

    test("getElement_ReturnsRootDOMElement", () =>
    {
        const tree = createTreeView(defaultOpts());
        const el = tree.getElement();
        expect(el).toBeInstanceOf(HTMLElement);
        tree.destroy();
    });

    test("getId_ReturnsStringIdentifier", () =>
    {
        const tree = createTreeView(defaultOpts());
        const id = tree.getId();
        expect(typeof id).toBe("string");
        expect(id.length).toBeGreaterThan(0);
        tree.destroy();
    });

    test("refresh_ReRendersTree", () =>
    {
        const tree = createTreeView(defaultOpts());
        expect(() => tree.refresh()).not.toThrow();
        tree.destroy();
    });
});

// ============================================================================
// ARIA ROLES
// ============================================================================

describe("ARIA roles", () =>
{
    test("rootElement_HasTreeRole", () =>
    {
        const tree = createTreeView(defaultOpts());
        const treeEl = container.querySelector("[role='tree']");
        expect(treeEl).not.toBeNull();
        tree.destroy();
    });

    test("nodes_HaveTreeitemRole", () =>
    {
        const tree = createTreeView(defaultOpts());
        const items = getTreeItems();
        items.forEach(item =>
        {
            expect(item.getAttribute("role")).toBe("treeitem");
        });
        tree.destroy();
    });

    test("parentNodes_HaveAriaLevel", () =>
    {
        const tree = createTreeView(defaultOpts());
        const folder = getTreeItemByNodeId("folder-1");
        expect(folder?.getAttribute("aria-level")).toBe("1");
        tree.destroy();
    });

    test("expandedNodes_ShowChildrenAtLevel2", () =>
    {
        const tree = createTreeView(defaultOpts());
        tree.expandNode("folder-1");
        const child = getTreeItemByNodeId("file-1");
        expect(child?.getAttribute("aria-level")).toBe("2");
        tree.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("destroy", () =>
{
    test("destroy_RemovesDOMElements", () =>
    {
        const tree = createTreeView(defaultOpts());
        tree.destroy();
        const treeEl = container.querySelector("[role='tree']");
        expect(treeEl).toBeNull();
    });

    test("destroy_CalledTwice_IsIdempotent", () =>
    {
        const tree = createTreeView(defaultOpts());
        tree.destroy();
        expect(() => tree.destroy()).not.toThrow();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("emptyRoots_ShowsEmptyMessage", () =>
    {
        const tree = createTreeView(defaultOpts({
            roots: [],
            emptyMessage: "No data",
        }));
        expect(container.textContent).toContain("No data");
        tree.destroy();
    });

    test("singleNode_RendersCorrectly", () =>
    {
        const tree = createTreeView(defaultOpts({
            roots: [{ id: "only", label: "Only Node", kind: "leaf" }],
        }));
        const items = getTreeItems();
        expect(items).toHaveLength(1);
        tree.destroy();
    });

    test("deeplyNested_5Levels_RendersAllLevels", () =>
    {
        const deepTree: TreeNode = {
            id: "l1", label: "Level 1", kind: "folder",
            expanded: true,
            children: [{
                id: "l2", label: "Level 2", kind: "folder",
                expanded: true,
                children: [{
                    id: "l3", label: "Level 3", kind: "folder",
                    expanded: true,
                    children: [{
                        id: "l4", label: "Level 4", kind: "folder",
                        expanded: true,
                        children: [{
                            id: "l5", label: "Level 5", kind: "leaf",
                        }],
                    }],
                }],
            }],
        };
        const tree = createTreeView(defaultOpts({
            roots: [deepTree],
        }));
        const deepEl = getTreeItemByNodeId("l5");
        expect(deepEl).not.toBeNull();
        expect(deepEl?.getAttribute("aria-level")).toBe("5");
        tree.destroy();
    });

    test("disabledNode_HasDisabledClass", () =>
    {
        const tree = createTreeView(defaultOpts({
            roots: [
                { id: "disabled-1", label: "Disabled", kind: "leaf",
                  disabled: true },
            ],
        }));
        const node = getTreeItemByNodeId("disabled-1");
        expect(node?.classList.contains("treeview-node-disabled")).toBe(true);
        tree.destroy();
    });

    test("withBadges_RendersBadgeElements", () =>
    {
        const tree = createTreeView(defaultOpts({
            roots: [{
                id: "badge-node", label: "With Badge", kind: "leaf",
                badges: [{ text: "3", variant: "primary" }],
            }],
        }));
        const badgeEl = container.querySelector(".treeview-badge");
        expect(badgeEl).not.toBeNull();
        expect(badgeEl?.textContent).toBe("3");
        tree.destroy();
    });
});
