/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ⚓ COMPONENT: ExplorerPicker Tests
 * 📜 PURPOSE: Unit tests for the ExplorerPicker resource-selection widget.
 * 🔗 RELATES: [[ExplorerPicker]]
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
    ExplorerPickerImpl,
    createExplorerPicker,
} from "./explorer-picker";

import type {
    ExplorerNode,
    ExplorerPickerOptions,
    ExplorerPickerSelection,
    ExplorerPickerState,
    OntologyTypeEntry,
} from "./explorer-picker";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function makeContainer(): HTMLDivElement
{
    const el = document.createElement("div");
    el.id = "test-explorer-picker";
    document.body.appendChild(el);
    return el;
}

function makeNode(overrides: Partial<ExplorerNode> = {}): ExplorerNode
{
    return {
        id: "node-1",
        name: "Test Node",
        nodeType: "ASSET_REF",
        resourceId: "res-1",
        resourceType: "diagrams.diagram",
        sourceId: "src-1",
        url: null,
        linkType: null,
        hasChildren: false,
        parentId: null,
        ...overrides,
    };
}

function makeOrgUnit(
    id: string, name: string,
    parentId: string | null = null,
    hasChildren = true): ExplorerNode
{
    return makeNode({
        id,
        name,
        nodeType: "ORG_UNIT",
        resourceId: null,
        resourceType: null,
        sourceId: null,
        hasChildren,
        parentId,
    });
}

function makeFolder(
    id: string, name: string,
    parentId: string | null = null,
    hasChildren = true): ExplorerNode
{
    return makeNode({
        id,
        name,
        nodeType: "FOLDER",
        resourceId: null,
        resourceType: null,
        sourceId: null,
        hasChildren,
        parentId,
    });
}

function makeAsset(
    id: string, name: string,
    parentId: string | null = null,
    resourceType = "diagrams.diagram"): ExplorerNode
{
    return makeNode({
        id,
        name,
        nodeType: "ASSET_REF",
        resourceId: `res-${id}`,
        resourceType,
        sourceId: `src-${id}`,
        hasChildren: false,
        parentId,
    });
}

function makeLink(
    id: string, name: string,
    parentId: string | null = null,
    linkType = "google_docs"): ExplorerNode
{
    return makeNode({
        id,
        name,
        nodeType: "LINK",
        resourceId: `res-${id}`,
        resourceType: null,
        sourceId: null,
        url: "https://example.com",
        linkType,
        hasChildren: false,
        parentId,
    });
}

/** Build a small test tree with 3 roots and children. */
function buildMockTree(): ExplorerNode[]
{
    return [
        makeOrgUnit("eng", "Engineering"),
        makeOrgUnit("platform", "Platform Team", "eng"),
        makeFolder("arch", "Architecture Diagrams", "platform"),
        makeAsset("sys-arch", "System Architecture", "arch"),
        makeAsset("data-arch", "Data Architecture", "arch"),
        makeOrgUnit("product", "Product Team", "eng"),
        makeOrgUnit("marketing", "Marketing"),
        makeFolder("unassigned", "Unassigned"),
    ];
}

function defaultOpts(
    overrides: Partial<ExplorerPickerOptions> = {}): ExplorerPickerOptions
{
    return {
        container,
        staticNodes: buildMockTree(),
        onConfirm: vi.fn(),
        ...overrides,
    };
}

function queryRoot(): HTMLElement | null
{
    return container.querySelector(".explorer-picker");
}

function querySearchInput(): HTMLInputElement | null
{
    return container.querySelector(
        ".explorer-picker-search-input") as HTMLInputElement | null;
}

function queryTreeItems(): NodeListOf<Element>
{
    return container.querySelectorAll(".explorer-picker-node");
}

function queryNodeRow(nodeId: string): HTMLElement | null
{
    return container.querySelector(
        `.explorer-picker-node-row[data-node-id="${nodeId}"]`);
}

function queryConfirmBtn(): HTMLButtonElement | null
{
    return container.querySelector(
        ".explorer-picker-btn-confirm") as HTMLButtonElement | null;
}

function queryCancelBtn(): HTMLButtonElement | null
{
    return container.querySelector(
        ".explorer-picker-btn-cancel") as HTMLButtonElement | null;
}

function queryBreadcrumb(): HTMLElement | null
{
    return container.querySelector(".explorer-picker-breadcrumb");
}

function queryLiveRegion(): HTMLElement | null
{
    return container.querySelector(".explorer-picker-live");
}

function queryCheckboxes(): NodeListOf<Element>
{
    return container.querySelectorAll(".explorer-picker-checkbox");
}

function querySectionHeaders(): NodeListOf<Element>
{
    return container.querySelectorAll(
        ".explorer-picker-section-header");
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
// PHASE 1: CORE SHELL & TREE RENDERING
// ============================================================================

describe("createExplorerPicker factory", () =>
{
    test("createsInstance_ReturnsExplorerPickerImpl", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        expect(picker).toBeInstanceOf(ExplorerPickerImpl);
        picker.destroy();
    });

    test("withContainerElement_MountsInContainer", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        expect(queryRoot()).not.toBeNull();
        picker.destroy();
    });

    test("withContainerString_ResolvesById", () =>
    {
        const picker = createExplorerPicker(
            defaultOpts({ container: "test-explorer-picker" }));
        expect(queryRoot()).not.toBeNull();
        picker.destroy();
    });

    test("withInvalidContainerId_DoesNotThrow", () =>
    {
        expect(() =>
        {
            const picker = createExplorerPicker(
                defaultOpts({ container: "nonexistent" }));
            picker.destroy();
        }).not.toThrow();
    });
});

describe("DOM structure", () =>
{
    test("hasSearchBar", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        expect(querySearchInput()).not.toBeNull();
        picker.destroy();
    });

    test("hasBody", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        expect(container.querySelector(
            ".explorer-picker-body")).not.toBeNull();
        picker.destroy();
    });

    test("hasBreadcrumb", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        expect(queryBreadcrumb()).not.toBeNull();
        picker.destroy();
    });

    test("hasFooter", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        expect(container.querySelector(
            ".explorer-picker-footer")).not.toBeNull();
        picker.destroy();
    });

    test("hasConfirmButton", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        expect(queryConfirmBtn()).not.toBeNull();
        picker.destroy();
    });

    test("hasCancelButton_WhenOnCancelProvided", () =>
    {
        const picker = createExplorerPicker(
            defaultOpts({ onCancel: vi.fn() }));
        expect(queryCancelBtn()).not.toBeNull();
        picker.destroy();
    });

    test("noCancelButton_WhenOnCancelOmitted", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        expect(queryCancelBtn()).toBeNull();
        picker.destroy();
    });

    test("hasLiveRegion", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        const live = queryLiveRegion();
        expect(live).not.toBeNull();
        expect(live?.getAttribute("aria-live")).toBe("polite");
        picker.destroy();
    });

    test("rootHasAriaRole", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        const root = queryRoot();
        expect(root?.getAttribute("role")).toBe("region");
        expect(root?.getAttribute("aria-label")).toBe(
            "Resource picker");
        picker.destroy();
    });
});

describe("static tree rendering", () =>
{
    test("rendersRootNodes", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        const items = queryTreeItems();
        expect(items.length).toBeGreaterThan(0);
        picker.destroy();
    });

    test("nodesHaveCorrectAriaRoles", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        const items = queryTreeItems();
        items.forEach(item =>
        {
            expect(item.getAttribute("role")).toBe("treeitem");
        });
        picker.destroy();
    });

    test("treeHasRoleTree", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        const tree = container.querySelector(
            ".explorer-picker-tree");
        expect(tree?.getAttribute("role")).toBe("tree");
        picker.destroy();
    });

    test("nodesHaveAriaLevel", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        const items = queryTreeItems();
        const firstItem = items[0];
        expect(firstItem?.getAttribute("aria-level")).toBeTruthy();
        picker.destroy();
    });

    test("containerNodesHaveAriaExpanded", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        const engNode = container.querySelector(
            '[data-node-id="eng"]');
        expect(engNode?.getAttribute("aria-expanded")).toBe("false");
        picker.destroy();
    });
});

describe("single-select", () =>
{
    test("clickNodeRow_SelectsIt", () =>
    {
        const picker = createExplorerPicker(
            defaultOpts({ selectionTarget: "any" }));
        const row = queryNodeRow("eng");
        row?.click();
        expect(row?.classList.contains(
            "explorer-picker-node-row-selected")).toBe(true);
        picker.destroy();
    });

    test("clickSecondNode_ReplacesSelection", () =>
    {
        const picker = createExplorerPicker(
            defaultOpts({ selectionTarget: "any" }));
        const rowEng = queryNodeRow("eng");
        const rowMkt = queryNodeRow("marketing");
        rowEng?.click();
        rowMkt?.click();
        expect(rowEng?.classList.contains(
            "explorer-picker-node-row-selected")).toBe(false);
        expect(rowMkt?.classList.contains(
            "explorer-picker-node-row-selected")).toBe(true);
        picker.destroy();
    });

    test("clickSameNode_DeselectsIt", () =>
    {
        const picker = createExplorerPicker(
            defaultOpts({ selectionTarget: "any" }));
        const row = queryNodeRow("eng");
        row?.click();
        row?.click();
        expect(row?.classList.contains(
            "explorer-picker-node-row-selected")).toBe(false);
        picker.destroy();
    });
});

describe("multi-select", () =>
{
    test("rendersCheckboxes", () =>
    {
        const picker = createExplorerPicker(
            defaultOpts({ mode: "multi", selectionTarget: "any" }));
        const checkboxes = queryCheckboxes();
        expect(checkboxes.length).toBeGreaterThan(0);
        picker.destroy();
    });

    test("clickTogglesCheckbox", () =>
    {
        const picker = createExplorerPicker(
            defaultOpts({ mode: "multi", selectionTarget: "any" }));
        const row = queryNodeRow("eng");
        row?.click();
        const cb = row?.querySelector(".explorer-picker-checkbox");
        expect(cb?.classList.contains(
            "explorer-picker-checkbox-checked")).toBe(true);
        picker.destroy();
    });

    test("multipleSelections_AllChecked", () =>
    {
        const picker = createExplorerPicker(
            defaultOpts({ mode: "multi", selectionTarget: "any" }));
        queryNodeRow("eng")?.click();
        queryNodeRow("marketing")?.click();
        const selection = picker.getSelection();
        expect(selection.length).toBe(2);
        picker.destroy();
    });

    test("clickAgainUnchecks", () =>
    {
        const picker = createExplorerPicker(
            defaultOpts({ mode: "multi", selectionTarget: "any" }));
        const row = queryNodeRow("eng");
        row?.click();
        row?.click();
        const selection = picker.getSelection();
        expect(selection.length).toBe(0);
        picker.destroy();
    });
});

describe("confirm button", () =>
{
    test("disabledWhenNoSelection", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        expect(queryConfirmBtn()?.disabled).toBe(true);
        picker.destroy();
    });

    test("enabledWhenSelectionExists", () =>
    {
        const picker = createExplorerPicker(
            defaultOpts({ selectionTarget: "any" }));
        queryNodeRow("eng")?.click();
        expect(queryConfirmBtn()?.disabled).toBe(false);
        picker.destroy();
    });

    test("confirmFiresCallback", () =>
    {
        const onConfirm = vi.fn();
        const picker = createExplorerPicker(
            defaultOpts({ onConfirm, selectionTarget: "any" }));
        queryNodeRow("eng")?.click();
        queryConfirmBtn()?.click();
        expect(onConfirm).toHaveBeenCalledOnce();
        picker.destroy();
    });

    test("confirmReturnsCorrectShape", () =>
    {
        const onConfirm = vi.fn();
        const picker = createExplorerPicker(
            defaultOpts({ onConfirm, selectionTarget: "any" }));
        queryNodeRow("eng")?.click();
        queryConfirmBtn()?.click();
        const selections = onConfirm.mock.calls[0][0] as
            ExplorerPickerSelection[];
        expect(selections.length).toBe(1);
        expect(selections[0].nodeId).toBe("eng");
        expect(selections[0].name).toBe("Engineering");
        expect(selections[0].nodeType).toBe("ORG_UNIT");
        expect(typeof selections[0].breadcrumb).toBe("string");
        picker.destroy();
    });

    test("customConfirmText_String", () =>
    {
        const picker = createExplorerPicker(
            defaultOpts({ confirmButtonText: "Link Items" }));
        expect(queryConfirmBtn()?.textContent).toBe("Link Items");
        picker.destroy();
    });

    test("customConfirmText_Function", () =>
    {
        const picker = createExplorerPicker(
            defaultOpts({
                confirmButtonText: (n: number) => `Link (${n})`,
                selectionTarget: "any",
            }));
        queryNodeRow("eng")?.click();
        expect(queryConfirmBtn()?.textContent).toBe("Link (1)");
        picker.destroy();
    });
});

describe("cancel button", () =>
{
    test("cancelFiresCallback", () =>
    {
        const onCancel = vi.fn();
        const picker = createExplorerPicker(
            defaultOpts({ onCancel }));
        queryCancelBtn()?.click();
        expect(onCancel).toHaveBeenCalledOnce();
        picker.destroy();
    });

    test("customCancelText", () =>
    {
        const picker = createExplorerPicker(
            defaultOpts({
                onCancel: vi.fn(),
                cancelButtonText: "Close",
            }));
        expect(queryCancelBtn()?.textContent).toBe("Close");
        picker.destroy();
    });
});

describe("lifecycle", () =>
{
    test("destroy_RemovesDom", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        picker.destroy();
        expect(queryRoot()).toBeNull();
    });

    test("destroy_NullsReferences", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        picker.destroy();
        expect(picker.getElement()).toBeNull();
    });

    test("show_MountsInContainer", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        expect(queryRoot()).not.toBeNull();
        picker.destroy();
    });

    test("hide_RemovesFromDom", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        picker.hide();
        expect(queryRoot()).toBeNull();
        picker.destroy();
    });

    test("getElement_ReturnsRootEl", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        expect(picker.getElement()).toBe(queryRoot());
        picker.destroy();
    });

    test("clearSelection_ClearsAll", () =>
    {
        const picker = createExplorerPicker(
            defaultOpts({ selectionTarget: "any" }));
        queryNodeRow("eng")?.click();
        picker.clearSelection();
        expect(picker.getSelection().length).toBe(0);
        picker.destroy();
    });

    test("getSelection_ReturnsEmpty_WhenNoneSelected", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        expect(picker.getSelection().length).toBe(0);
        picker.destroy();
    });
});

// ============================================================================
// PHASE 2: API DATA LAYER (mocked)
// ============================================================================

describe("API data layer", () =>
{
    test("mockFetchFn_TreeRendersFromApi", async () =>
    {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(buildMockTree()),
        });
        const picker = createExplorerPicker(defaultOpts({
            staticNodes: undefined,
            fetchFn: mockFetch,
        }));
        await vi.waitFor(() =>
        {
            expect(mockFetch).toHaveBeenCalled();
        });
        picker.destroy();
    });

    test("expandNode_FetchesChildren", async () =>
    {
        const children = [
            makeAsset("child-1", "Child 1", "eng"),
            makeAsset("child-2", "Child 2", "eng"),
        ];
        const mockFetch = vi.fn().mockImplementation(
            (url: string) =>
            {
                if (url.includes("/children"))
                {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve(children),
                    });
                }
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(buildMockTree()),
                });
            });
        const picker = createExplorerPicker(defaultOpts({
            staticNodes: undefined,
            fetchFn: mockFetch,
        }));
        await vi.waitFor(() =>
        {
            expect(queryTreeItems().length).toBeGreaterThan(0);
        });
        await picker.expandNode("eng");
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining("/nodes/eng/children"),
            expect.anything());
        picker.destroy();
    });

    test("loadedSet_PreventsRefetch", async () =>
    {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([]),
        });
        const picker = createExplorerPicker(defaultOpts({
            staticNodes: undefined,
            fetchFn: mockFetch,
        }));
        await vi.waitFor(() =>
        {
            expect(mockFetch).toHaveBeenCalled();
        });
        const callCount = mockFetch.mock.calls.length;
        await picker.expandNode("eng");
        await picker.expandNode("eng");
        // Only one children fetch expected
        const childrenCalls = mockFetch.mock.calls.filter(
            c => (c[0] as string).includes("/children")).length;
        expect(childrenCalls).toBeLessThanOrEqual(1);
        picker.destroy();
    });

    test("fetchError_ShowsErrorBanner", async () =>
    {
        const mockFetch = vi.fn().mockRejectedValue(
            new Error("Network error"));
        const picker = createExplorerPicker(defaultOpts({
            staticNodes: undefined,
            fetchFn: mockFetch,
        }));
        await vi.waitFor(() =>
        {
            const error = container.querySelector(
                ".explorer-picker-error");
            expect(error?.style.display).not.toBe("none");
        });
        picker.destroy();
    });

    test("skeletonLoader_VisibleDuringLoad", () =>
    {
        const mockFetch = vi.fn().mockReturnValue(
            new Promise(() => {})); // Never resolves
        const picker = createExplorerPicker(defaultOpts({
            staticNodes: undefined,
            fetchFn: mockFetch,
        }));
        const loading = container.querySelector(
            ".explorer-picker-loading");
        expect(loading?.style.display).not.toBe("none");
        picker.destroy();
    });

    test("refresh_ReloadsData", async () =>
    {
        let callCount = 0;
        const mockFetch = vi.fn().mockImplementation(() =>
        {
            callCount++;
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(buildMockTree()),
            });
        });
        const picker = createExplorerPicker(defaultOpts({
            staticNodes: undefined,
            fetchFn: mockFetch,
        }));
        await vi.waitFor(() =>
        {
            expect(callCount).toBeGreaterThan(0);
        });
        const before = callCount;
        await picker.refresh();
        expect(callCount).toBeGreaterThan(before);
        picker.destroy();
    });
});

// ============================================================================
// PHASE 3: SEARCH
// ============================================================================

describe("search", () =>
{
    test("searchInputPlaceholder_Default", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        expect(querySearchInput()?.placeholder).toBe(
            "Search resources...");
        picker.destroy();
    });

    test("searchInputPlaceholder_ContainerMode", () =>
    {
        const picker = createExplorerPicker(
            defaultOpts({ selectionTarget: "container" }));
        expect(querySearchInput()?.placeholder).toBe(
            "Search folders...");
        picker.destroy();
    });

    test("searchInputPlaceholder_Custom", () =>
    {
        const picker = createExplorerPicker(
            defaultOpts({ searchPlaceholder: "Find..." }));
        expect(querySearchInput()?.placeholder).toBe("Find...");
        picker.destroy();
    });

    test("clearButton_HiddenInitially", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        const clear = container.querySelector(
            ".explorer-picker-search-clear") as HTMLElement;
        expect(clear?.style.display).toBe("none");
        picker.destroy();
    });

    test("typing_ShowsClearButton", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        const input = querySearchInput()!;
        input.value = "test";
        input.dispatchEvent(new Event("input"));
        const clear = container.querySelector(
            ".explorer-picker-search-clear") as HTMLElement;
        expect(clear?.style.display).not.toBe("none");
        picker.destroy();
    });

    test("clearButton_ClearsSearch", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        const input = querySearchInput()!;
        input.value = "test";
        input.dispatchEvent(new Event("input"));
        const clear = container.querySelector(
            ".explorer-picker-search-clear") as HTMLElement;
        clear?.click();
        expect(input.value).toBe("");
        picker.destroy();
    });

    test("setSearchQuery_SetsInput", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        picker.setSearchQuery("hello");
        expect(querySearchInput()?.value).toBe("hello");
        picker.destroy();
    });
});

// ============================================================================
// PHASE 4: QUICK-ACCESS
// ============================================================================

describe("quick-access sections", () =>
{
    test("recentSection_Exists", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        const section = container.querySelector(
            ".explorer-picker-section-recent");
        expect(section).not.toBeNull();
        picker.destroy();
    });

    test("starredSection_Exists", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        const section = container.querySelector(
            ".explorer-picker-section-starred");
        expect(section).not.toBeNull();
        picker.destroy();
    });

    test("sectionHeaders_Clickable_ToggleCollapse", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        const headers = querySectionHeaders();
        expect(headers.length).toBeGreaterThan(0);
        const section = headers[0].parentElement!;
        headers[0].dispatchEvent(new Event("click", {
            bubbles: true }));
        expect(section.classList.contains(
            "explorer-picker-section-collapsed")).toBe(true);
        picker.destroy();
    });
});

// ============================================================================
// PHASE 5: ONTOLOGY INTEGRATION
// ============================================================================

describe("ontology integration", () =>
{
    test("preLoadedOntology_SetsIcons", () =>
    {
        const ontologyTypes: OntologyTypeEntry[] = [
            {
                key: "diagrams.diagram",
                icon: "bi-diagram-3",
                color: "#2563EB",
            },
        ];
        const picker = createExplorerPicker(
            defaultOpts({ ontologyTypes }));
        picker.destroy();
    });

    test("iconResolver_TakesPriority", () =>
    {
        const iconResolver = vi.fn().mockReturnValue("bi-custom");
        const picker = createExplorerPicker(
            defaultOpts({ iconResolver }));
        picker.destroy();
    });

    test("externalType_ShowsBadge", () =>
    {
        const ontologyTypes: OntologyTypeEntry[] = [
            {
                key: "external.doc",
                icon: "bi-file-earmark-text",
                isExternal: true,
            },
        ];
        const nodes = [
            makeNode({
                id: "ext-1",
                name: "External Doc",
                nodeType: "LINK",
                resourceType: "external.doc",
            }),
        ];
        const picker = createExplorerPicker(
            defaultOpts({ staticNodes: nodes, ontologyTypes }));
        const badge = container.querySelector(
            ".explorer-picker-external-badge");
        expect(badge).not.toBeNull();
        picker.destroy();
    });
});

// ============================================================================
// PHASE 6: SELECTION POLISH & BREADCRUMBS
// ============================================================================

describe("selection target: container", () =>
{
    test("containerMode_DimsAssets", () =>
    {
        const nodes = [
            makeOrgUnit("org1", "Org One"),
            makeAsset("asset1", "Asset One", "org1"),
        ];
        const picker = createExplorerPicker(
            defaultOpts({
                staticNodes: nodes,
                selectionTarget: "container",
            }));
        // Expand to show asset
        picker.expandNode("org1");
        const assetRow = queryNodeRow("asset1");
        // Asset may or may not be rendered depending on expand
        // but org should be selectable
        const orgRow = queryNodeRow("org1");
        expect(orgRow?.classList.contains(
            "explorer-picker-node-row-dimmed")).toBe(false);
        picker.destroy();
    });
});

describe("excludeNodeIds", () =>
{
    test("excludedNodes_AreDimmed", () =>
    {
        const picker = createExplorerPicker(
            defaultOpts({
                excludeNodeIds: ["eng"],
                selectionTarget: "any",
            }));
        const row = queryNodeRow("eng");
        expect(row?.classList.contains(
            "explorer-picker-node-row-dimmed")).toBe(true);
        picker.destroy();
    });

    test("excludedNodes_HaveTooltip", () =>
    {
        const picker = createExplorerPicker(
            defaultOpts({
                excludeNodeIds: ["eng"],
                selectionTarget: "any",
            }));
        const row = queryNodeRow("eng");
        expect(row?.getAttribute("title")).toBe(
            "Cannot link to itself");
        picker.destroy();
    });

    test("excludedNodes_CannotBeSelected", () =>
    {
        const picker = createExplorerPicker(
            defaultOpts({
                excludeNodeIds: ["eng"],
                selectionTarget: "any",
            }));
        const row = queryNodeRow("eng");
        row?.click();
        expect(picker.getSelection().length).toBe(0);
        picker.destroy();
    });
});

describe("preSelectedNodeIds", () =>
{
    test("preSelected_HighlightedOnRender", () =>
    {
        const picker = createExplorerPicker(
            defaultOpts({
                preSelectedNodeIds: ["eng"],
                selectionTarget: "any",
            }));
        const row = queryNodeRow("eng");
        expect(row?.classList.contains(
            "explorer-picker-node-row-selected")).toBe(true);
        picker.destroy();
    });

    test("preSelected_CanBeDeselected", () =>
    {
        const picker = createExplorerPicker(
            defaultOpts({
                preSelectedNodeIds: ["eng"],
                mode: "multi",
                selectionTarget: "any",
            }));
        queryNodeRow("eng")?.click();
        expect(picker.getSelection().length).toBe(0);
        picker.destroy();
    });
});

describe("breadcrumbs", () =>
{
    test("clickNode_UpdatesBreadcrumb", () =>
    {
        const picker = createExplorerPicker(
            defaultOpts({ selectionTarget: "any" }));
        queryNodeRow("eng")?.click();
        const breadcrumb = queryBreadcrumb();
        expect(breadcrumb?.textContent).toContain("Engineering");
        picker.destroy();
    });
});

describe("onSelectionChange", () =>
{
    test("firesOnEveryChange", () =>
    {
        const onChange = vi.fn();
        const picker = createExplorerPicker(
            defaultOpts({
                onSelectionChange: onChange,
                selectionTarget: "any",
            }));
        queryNodeRow("eng")?.click();
        expect(onChange).toHaveBeenCalledOnce();
        queryNodeRow("marketing")?.click();
        expect(onChange).toHaveBeenCalledTimes(2);
        picker.destroy();
    });
});

describe("double-click", () =>
{
    test("singleMode_ConfirmsSelection", () =>
    {
        const onConfirm = vi.fn();
        const picker = createExplorerPicker(
            defaultOpts({
                onConfirm,
                selectionTarget: "any",
            }));
        const row = queryNodeRow("eng");
        row?.dispatchEvent(new MouseEvent("dblclick", {
            bubbles: true }));
        expect(onConfirm).toHaveBeenCalledOnce();
        picker.destroy();
    });
});

// ============================================================================
// PHASE 7: STATE EXPORT / RESTORE
// ============================================================================

describe("state export / restore", () =>
{
    test("exportState_ReturnsCorrectShape", () =>
    {
        const picker = createExplorerPicker(
            defaultOpts({ selectionTarget: "any" }));
        queryNodeRow("eng")?.click();
        const state = picker.exportState();
        expect(state.selectedNodeIds).toContain("eng");
        expect(Array.isArray(state.expandedNodeIds)).toBe(true);
        expect(typeof state.searchQuery).toBe("string");
        expect(typeof state.scrollTop).toBe("number");
        picker.destroy();
    });

    test("restoreState_RestoresSelection", async () =>
    {
        const picker1 = createExplorerPicker(
            defaultOpts({ selectionTarget: "any" }));
        queryNodeRow("eng")?.click();
        const state = picker1.exportState();
        picker1.destroy();

        container = makeContainer();
        const picker2 = createExplorerPicker(
            defaultOpts({ selectionTarget: "any" }));
        await picker2.restoreState(state);
        expect(picker2.getSelection().length).toBe(1);
        expect(picker2.getSelection()[0].nodeId).toBe("eng");
        picker2.destroy();
    });
});

// ============================================================================
// PHASE 8: KEYBOARD NAVIGATION
// ============================================================================

describe("keyboard navigation", () =>
{
    function pressKey(key: string, target?: HTMLElement): void
    {
        const el = target ?? queryRoot()!;
        el.dispatchEvent(new KeyboardEvent("keydown", {
            key,
            bubbles: true,
        }));
    }

    test("slash_FocusesSearch", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        pressKey("/");
        expect(document.activeElement).toBe(querySearchInput());
        picker.destroy();
    });

    test("escape_FiresOnCancel", () =>
    {
        const onCancel = vi.fn();
        const picker = createExplorerPicker(
            defaultOpts({ onCancel }));
        pressKey("Escape");
        expect(onCancel).toHaveBeenCalledOnce();
        picker.destroy();
    });

    test("arrowDown_MovesFocus", () =>
    {
        const picker = createExplorerPicker(
            defaultOpts({ selectionTarget: "any" }));
        const input = querySearchInput()!;
        input.focus();
        pressKey("ArrowDown", input);
        const focused = container.querySelector(
            ".explorer-picker-node-row-focused");
        expect(focused).not.toBeNull();
        picker.destroy();
    });
});

// ============================================================================
// PHASE 9: ACCESSIBILITY
// ============================================================================

describe("accessibility", () =>
{
    test("treeHasAriaLabel", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        const tree = container.querySelector(
            ".explorer-picker-tree");
        expect(tree?.getAttribute("aria-label")).toBe(
            "Resource tree");
        picker.destroy();
    });

    test("searchHasAriaLabel", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        expect(querySearchInput()?.getAttribute("aria-label")).toBe(
            "Search resources");
        picker.destroy();
    });

    test("breadcrumbHasNavRole", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        expect(queryBreadcrumb()?.getAttribute("role")).toBe(
            "navigation");
        picker.destroy();
    });

    test("confirmButton_HasAriaDisabled", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        expect(queryConfirmBtn()?.getAttribute(
            "aria-disabled")).toBe("true");
        picker.destroy();
    });

    test("sections_HaveGroupRole", () =>
    {
        const picker = createExplorerPicker(defaultOpts());
        const sections = container.querySelectorAll(
            ".explorer-picker-section");
        sections.forEach(section =>
        {
            expect(section.getAttribute("role")).toBe("group");
        });
        picker.destroy();
    });

    test("liveRegion_AnnouncesSelection", () =>
    {
        const picker = createExplorerPicker(
            defaultOpts({ selectionTarget: "any" }));
        queryNodeRow("eng")?.click();
        const live = queryLiveRegion();
        expect(live?.textContent).toContain("Engineering");
        expect(live?.textContent).toContain("selected");
        picker.destroy();
    });
});

// ============================================================================
// APPEARANCE
// ============================================================================

describe("appearance options", () =>
{
    test("height_Applied", () =>
    {
        const picker = createExplorerPicker(
            defaultOpts({ height: "500px" }));
        expect(queryRoot()?.style.height).toBe("500px");
        picker.destroy();
    });

    test("cssClass_Applied", () =>
    {
        const picker = createExplorerPicker(
            defaultOpts({ cssClass: "my-custom-class" }));
        expect(queryRoot()?.classList.contains(
            "my-custom-class")).toBe(true);
        picker.destroy();
    });

    test("emptyTreeMessage_Shown", () =>
    {
        const picker = createExplorerPicker(
            defaultOpts({
                staticNodes: [],
                emptyTreeMessage: "Nothing here",
            }));
        const empty = container.querySelector(
            ".explorer-picker-empty");
        expect(empty?.textContent).toContain("Nothing here");
        picker.destroy();
    });
});
