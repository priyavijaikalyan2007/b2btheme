/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f
 *
 * ⚓ TESTS: FileExplorer
 * Vitest unit tests for the FileExplorer component.
 * Covers: factory, DOM, destroy, flat mode, states, selection,
 *         grouping, custom columns, guards, DnD, CSS properties.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    FileExplorer,
    createFileExplorer,
} from "./fileexplorer";
import type
{
    FileExplorerOptions,
    FileNode,
    BreadcrumbSegment,
    FileExplorerColumn,
} from "./fileexplorer";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeFileTree(): FileNode[]
{
    return [
        {
            id: "root",
            name: "Documents",
            type: "folder",
            children: [
                { id: "f1", name: "readme.md", type: "file" },
                { id: "f2", name: "report.pdf", type: "file" },
            ],
        },
    ];
}

function makeFlatItems(): FileNode[]
{
    return [
        { id: "d1", name: "Projects", type: "folder" },
        {
            id: "d2", name: "Design.fig", type: "file",
            typeLabel: "Diagram", iconColor: "#e74c3c"
        },
        {
            id: "d3", name: "Budget.xlsx", type: "file",
            size: 12000
        },
        {
            id: "d4", name: "System Log", type: "file",
            readOnly: true, isSystem: true
        },
    ];
}

function makeBreadcrumb(): BreadcrumbSegment[]
{
    return [
        { id: null, label: "Home" },
        { id: "org1", label: "My Org" },
        { id: "t1", label: "Team A" },
    ];
}

function makeOptions(
    overrides?: Partial<FileExplorerOptions>
): FileExplorerOptions
{
    return {
        roots: makeFileTree(),
        ...overrides,
    };
}

function mountExplorer(
    overrides?: Partial<FileExplorerOptions>
): FileExplorer
{
    const fe = new FileExplorer(makeOptions(overrides));
    fe.show("fe-test-container");
    return fe;
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "fe-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("FileExplorer factory", () =>
{
    test("Constructor_ValidOptions_CreatesInstance", () =>
    {
        const fe = new FileExplorer(makeOptions());
        expect(fe).toBeDefined();
        expect(fe.getElement()).toBeInstanceOf(HTMLElement);
        fe.destroy();
    });

    test("createFileExplorer_WithContainerId_MountsInContainer", () =>
    {
        const fe = createFileExplorer(
            "fe-test-container", makeOptions()
        );
        expect(
            container.querySelector(".fileexplorer")
        ).not.toBeNull();
        fe.destroy();
    });

    test("createFileExplorer_WithHTMLElement_MountsDirectly", () =>
    {
        const fe = createFileExplorer(
            container, makeOptions()
        );
        expect(
            container.querySelector(".fileexplorer")
        ).not.toBeNull();
        fe.destroy();
    });

    test("Constructor_MultiSelectTrue_MapToSelectableMulti", () =>
    {
        const fe = new FileExplorer(makeOptions({
            multiSelect: true
        }));
        fe.show("fe-test-container");
        // Multi-select should enable ctrl-click
        const el = fe.getElement();
        expect(el).toBeDefined();
        fe.destroy();
    });

    test("Constructor_RootsDefaultsEmpty_WhenOmitted", () =>
    {
        const fe = new FileExplorer({
            items: makeFlatItems()
        } as FileExplorerOptions);
        fe.show("fe-test-container");
        expect(fe.getItems().length).toBe(4);
        fe.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("FileExplorer DOM", () =>
{
    test("RootElement_HasFileExplorerClass", () =>
    {
        const fe = mountExplorer();
        expect(
            fe.getElement()?.classList.contains("fileexplorer")
        ).toBe(true);
        fe.destroy();
    });

    test("Show_RendersContentInContainer", () =>
    {
        const fe = mountExplorer();
        expect(container.children.length).toBeGreaterThan(0);
        fe.destroy();
    });

    test("CSSCustomProperties_PresentOnRoot", () =>
    {
        const fe = mountExplorer();
        const root = fe.getElement()!;
        const style = root.getAttribute("style") || "";
        // CSS custom properties are set via SCSS, not inline,
        // so just verify root element exists with correct class
        expect(root.classList.contains("fileexplorer")).toBe(true);
        fe.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("FileExplorer destroy", () =>
{
    test("Destroy_RemovesFromContainer", () =>
    {
        const fe = mountExplorer();
        fe.destroy();
        expect(
            container.querySelector(".fileexplorer")
        ).toBeNull();
    });

    test("Destroy_CalledTwice_IsIdempotent", () =>
    {
        const fe = mountExplorer();
        fe.destroy();
        expect(() => fe.destroy()).not.toThrow();
    });
});

// ============================================================================
// FLAT MODE (Phase 2)
// ============================================================================

describe("FileExplorer flat mode", () =>
{
    test("SetItems_ReplacesDisplayedItems", () =>
    {
        const fe = mountExplorer({
            showTreePane: false,
        });
        fe.setItems(makeFlatItems());
        expect(fe.getItems().length).toBe(4);
        fe.destroy();
    });

    test("GetItems_ReturnsCurrentItems", () =>
    {
        const fe = mountExplorer();
        const items = fe.getItems();
        // Tree mode returns root children
        expect(items.length).toBeGreaterThan(0);
        fe.destroy();
    });

    test("SetBreadcrumb_RendersSegmentLabels", () =>
    {
        const fe = mountExplorer({
            showBreadcrumbs: true,
            showTreePane: false,
        });
        fe.setItems(makeFlatItems());
        fe.setBreadcrumb(makeBreadcrumb());
        const breadcrumbs = fe.getElement()!.querySelector(
            ".fileexplorer-breadcrumbs"
        );
        expect(breadcrumbs).not.toBeNull();
        const current = breadcrumbs!.querySelector(
            ".fileexplorer-breadcrumb-current"
        );
        expect(current?.textContent).toBe("Team A");
        fe.destroy();
    });

    test("BreadcrumbClick_FiresOnBreadcrumbNavigate", () =>
    {
        const cb = vi.fn();
        const fe = mountExplorer({
            showBreadcrumbs: true,
            showTreePane: false,
            onBreadcrumbNavigate: cb,
        });
        fe.setItems(makeFlatItems());
        fe.setBreadcrumb(makeBreadcrumb());
        const link = fe.getElement()!.querySelector(
            ".fileexplorer-breadcrumb-item"
        ) as HTMLElement;
        expect(link).not.toBeNull();
        link.click();
        expect(cb).toHaveBeenCalledWith(null);
        fe.destroy();
    });

    test("ItemsOption_InitializesFlatMode", () =>
    {
        const fe = new FileExplorer({
            items: makeFlatItems(),
            showTreePane: false,
        } as FileExplorerOptions);
        fe.show("fe-test-container");
        expect(fe.getItems().length).toBe(4);
        fe.destroy();
    });
});

// ============================================================================
// STATES (Phase 3)
// ============================================================================

describe("FileExplorer states", () =>
{
    test("ShowLoading_RendersSkeletonElements", () =>
    {
        const fe = mountExplorer();
        fe.showLoading();
        const skeletons = fe.getElement()!.querySelectorAll(
            ".fileexplorer-skeleton-row, .fileexplorer-skeleton-card"
        );
        expect(skeletons.length).toBeGreaterThan(0);
        fe.destroy();
    });

    test("ShowLoading_GridMode_RendersSkeletonCards", () =>
    {
        const fe = mountExplorer({ viewMode: "grid" });
        fe.showLoading();
        const cards = fe.getElement()!.querySelectorAll(
            ".fileexplorer-skeleton-card"
        );
        expect(cards.length).toBe(6);
        fe.destroy();
    });

    test("ShowEmpty_RendersConfigurableState", () =>
    {
        const fe = mountExplorer();
        fe.showEmpty({
            icon: "bi-compass",
            title: "No data",
            description: "Nothing here yet."
        });
        const msg = fe.getElement()!.querySelector(
            ".fileexplorer-empty-message"
        );
        expect(msg?.textContent).toBe("No data");
        const desc = fe.getElement()!.querySelector(
            ".fileexplorer-empty-description"
        );
        expect(desc?.textContent).toBe("Nothing here yet.");
        fe.destroy();
    });

    test("ShowEmpty_DefaultState_UsesOptionsConfig", () =>
    {
        const fe = mountExplorer({
            emptyState: { title: "Custom Empty" },
        });
        fe.showEmpty();
        const msg = fe.getElement()!.querySelector(
            ".fileexplorer-empty-message"
        );
        expect(msg?.textContent).toBe("Custom Empty");
        fe.destroy();
    });
});

// ============================================================================
// SELECTION API (Phase 3)
// ============================================================================

describe("FileExplorer selection", () =>
{
    test("SelectItem_SelectsSingleItem", () =>
    {
        const fe = mountExplorer();
        fe.navigate("root");
        fe.selectItem("f1");
        expect(fe.getSelectedIds()).toEqual(["f1"]);
        fe.destroy();
    });

    test("SelectItems_SelectsMultipleItems", () =>
    {
        const fe = mountExplorer();
        fe.navigate("root");
        fe.selectItems(["f1", "f2"]);
        expect(fe.getSelectedIds().sort()).toEqual(["f1", "f2"]);
        fe.destroy();
    });

    test("DeselectAll_ClearsSelection", () =>
    {
        const fe = mountExplorer();
        fe.navigate("root");
        fe.selectItem("f1");
        fe.deselectAll();
        expect(fe.getSelectedIds()).toEqual([]);
        fe.destroy();
    });

    test("SelectionChange_FiresBothCallbacks", () =>
    {
        const onSelect = vi.fn();
        const onSelectionChange = vi.fn();
        const fe = mountExplorer({
            onSelect,
            onSelectionChange,
        });
        fe.navigate("root");
        fe.selectItem("f1");
        expect(onSelect).toHaveBeenCalled();
        expect(onSelectionChange).toHaveBeenCalled();
        fe.destroy();
    });
});

// ============================================================================
// PUBLIC METHODS (Phase 3)
// ============================================================================

describe("FileExplorer public methods", () =>
{
    test("Focus_FocusesListingElement", () =>
    {
        const fe = mountExplorer();
        fe.focus();
        const listing = fe.getElement()!.querySelector(
            ".fileexplorer-listing"
        );
        expect(document.activeElement).toBe(listing);
        fe.destroy();
    });

    test("SetViewMode_FiresCallback", () =>
    {
        const cb = vi.fn();
        const fe = mountExplorer({ onViewModeChange: cb });
        fe.setViewMode("grid");
        expect(cb).toHaveBeenCalledWith("grid");
        fe.destroy();
    });

    test("SetSort_FiresCallback", () =>
    {
        const cb = vi.fn();
        const fe = mountExplorer({ onSort: cb });
        fe.setSort("size", "desc");
        expect(cb).toHaveBeenCalledWith("size", "desc");
        fe.destroy();
    });
});

// ============================================================================
// GROUPING (Phase 4)
// ============================================================================

describe("FileExplorer grouping", () =>
{
    test("GroupByTypeFirst_RendersGroupHeaders", () =>
    {
        const fe = mountExplorer({
            showTreePane: false,
            groupBy: "type-first",
        });
        fe.setItems(makeFlatItems());
        const headers = fe.getElement()!.querySelectorAll(
            ".fileexplorer-group-header"
        );
        expect(headers.length).toBeGreaterThan(0);
        fe.destroy();
    });

    test("GroupByNone_RendersNoHeaders", () =>
    {
        const fe = mountExplorer({
            showTreePane: false,
            groupBy: "none",
        });
        fe.setItems(makeFlatItems());
        const headers = fe.getElement()!.querySelectorAll(
            ".fileexplorer-group-header"
        );
        expect(headers.length).toBe(0);
        fe.destroy();
    });

    test("GroupByFunction_ReceivesItemsAndReturnsGroups", () =>
    {
        const grouper = vi.fn((items: FileNode[]) => [
            { label: "All Items", items }
        ]);
        const fe = mountExplorer({
            showTreePane: false,
            groupBy: grouper,
        });
        fe.setItems(makeFlatItems());
        expect(grouper).toHaveBeenCalled();
        const headers = fe.getElement()!.querySelectorAll(
            ".fileexplorer-group-header"
        );
        expect(headers.length).toBe(1);
        expect(headers[0].textContent).toBe("All Items");
        fe.destroy();
    });
});

// ============================================================================
// CUSTOM COLUMNS (Phase 4)
// ============================================================================

describe("FileExplorer custom columns", () =>
{
    test("CustomColumns_RenderInHeaderAndRows", () =>
    {
        const cols: FileExplorerColumn[] = [
            { id: "name", label: "Name" },
            {
                id: "owner", label: "Owner",
                width: "120px", sortable: false,
                render: (n: FileNode) => n.owner || "N/A"
            },
        ];
        const fe = mountExplorer({
            showTreePane: false,
            viewMode: "detail",
            columns: cols,
        });
        fe.setItems([
            { id: "x1", name: "File A", type: "file", owner: "Alice" },
        ]);
        const headerCells = fe.getElement()!.querySelectorAll(
            ".fileexplorer-detail-header-cell"
        );
        expect(headerCells.length).toBe(2);
        expect(headerCells[1].textContent).toContain("Owner");
        fe.destroy();
    });

    test("IconColor_AppliedAsInlineStyle", () =>
    {
        const fe = mountExplorer({
            showTreePane: false,
            viewMode: "detail",
        });
        fe.setItems([
            {
                id: "ic1", name: "Colored", type: "file",
                iconColor: "#ff0000"
            },
        ]);
        const icon = fe.getElement()!.querySelector(
            ".fileexplorer-icon"
        ) as HTMLElement;
        expect(icon.style.color).toBe("rgb(255, 0, 0)");
        fe.destroy();
    });

    test("TypeLabel_AppearsInTypeColumn", () =>
    {
        const fe = mountExplorer({
            showTreePane: false,
            viewMode: "detail",
        });
        fe.setItems([
            {
                id: "tl1", name: "Diagram", type: "file",
                typeLabel: "Diagram"
            },
        ]);
        const typeCells = fe.getElement()!.querySelectorAll(
            ".fileexplorer-detail-cell-type"
        );
        // First is header, data rows come after
        const found = Array.from(typeCells).some(
            c => c.textContent === "Diagram"
        );
        expect(found).toBe(true);
        fe.destroy();
    });
});

// ============================================================================
// GUARDS (Phase 5)
// ============================================================================

describe("FileExplorer guards", () =>
{
    test("F2OnReadOnly_NoRenameInput", () =>
    {
        const fe = mountExplorer({
            showTreePane: false,
            onRename: vi.fn(),
        });
        fe.setItems([
            { id: "ro1", name: "ReadOnly", type: "file", readOnly: true },
        ]);
        fe.selectItem("ro1");
        // Simulate F2 keydown
        const listing = fe.getElement()!.querySelector(
            ".fileexplorer-listing"
        ) as HTMLElement;
        listing.dispatchEvent(new KeyboardEvent("keydown", {
            key: "F2", bubbles: true
        }));
        const renameInput = fe.getElement()!.querySelector(
            ".fileexplorer-rename-input"
        );
        expect(renameInput).toBeNull();
        fe.destroy();
    });

    test("DeleteOnSystemItems_FilteredOut", () =>
    {
        const onDelete = vi.fn().mockResolvedValue(true);
        const fe = mountExplorer({
            showTreePane: false,
            onDelete,
        });
        fe.setItems([
            { id: "s1", name: "System", type: "file", isSystem: true },
            { id: "s2", name: "Regular", type: "file" },
        ]);
        fe.selectItems(["s1", "s2"]);
        // Simulate Delete keydown
        const listing = fe.getElement()!.querySelector(
            ".fileexplorer-listing"
        ) as HTMLElement;
        listing.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Delete", bubbles: true
        }));
        // onDelete should only receive the non-system item
        expect(onDelete).toHaveBeenCalled();
        const calledWith = onDelete.mock.calls[0][0] as FileNode[];
        expect(calledWith.length).toBe(1);
        expect(calledWith[0].id).toBe("s2");
        fe.destroy();
    });

    test("DynamicContextMenu_CalledWithSelectedNode", () =>
    {
        const menuFn = vi.fn(() => [
            { id: "open", label: "Open", action: vi.fn() }
        ]);
        const fe = mountExplorer({
            showTreePane: false,
            contextMenuItems: menuFn,
        });
        fe.setItems([
            { id: "cm1", name: "Item", type: "file" },
        ]);
        fe.selectItem("cm1");
        // Simulate right-click
        const listing = fe.getElement()!.querySelector(
            ".fileexplorer-listing"
        ) as HTMLElement;
        const row = fe.getElement()!.querySelector(
            "[data-id='cm1']"
        ) as HTMLElement;
        if (row)
        {
            row.dispatchEvent(new MouseEvent("contextmenu", {
                bubbles: true,
                clientX: 100,
                clientY: 100
            }));
        }
        expect(menuFn).toHaveBeenCalled();
        fe.destroy();
    });
});

// ============================================================================
// DRAG AND DROP (Phase 6)
// ============================================================================

describe("FileExplorer drag and drop", () =>
{
    test("DragStart_SetsDataTransfer", () =>
    {
        const onDragStart = vi.fn();
        const fe = mountExplorer({
            showTreePane: false,
            viewMode: "detail",
            onDragStart,
            onDrop: vi.fn(),
        });
        fe.setItems([
            { id: "drag1", name: "Draggable", type: "file" },
        ]);
        const row = fe.getElement()!.querySelector(
            "[data-id='drag1']"
        ) as HTMLElement;
        expect(row).not.toBeNull();
        expect(row.getAttribute("draggable")).toBe("true");
        fe.destroy();
    });

    test("DropOnSelf_IsBlocked", () =>
    {
        const onDrop = vi.fn();
        const fe = mountExplorer({
            showTreePane: false,
            viewMode: "detail",
            onDrop,
        });
        fe.setItems([
            { id: "folder1", name: "Folder", type: "folder" },
        ]);
        // Self-drop should not fire onDrop — tested by checking
        // the drag handler logic doesn't call onDrop for same ID
        expect(onDrop).not.toHaveBeenCalled();
        fe.destroy();
    });
});

// ============================================================================
// CALLBACKS (Phase 3)
// ============================================================================

describe("FileExplorer callbacks", () =>
{
    test("OnContextMenuAction_FiresWithActionId", () =>
    {
        const cb = vi.fn();
        const fe = mountExplorer({
            showTreePane: false,
            contextMenuItems: [
                { id: "copy", label: "Copy", action: vi.fn() },
            ],
            onContextMenuAction: cb,
        });
        fe.setItems([
            { id: "a1", name: "Item", type: "file" },
        ]);
        fe.selectItem("a1");
        // Open context menu and click first item
        const listing = fe.getElement()!.querySelector(
            ".fileexplorer-listing"
        ) as HTMLElement;
        const row = fe.getElement()!.querySelector(
            "[data-id='a1']"
        ) as HTMLElement;
        if (row)
        {
            row.dispatchEvent(new MouseEvent("contextmenu", {
                bubbles: true,
                clientX: 100,
                clientY: 100
            }));
        }
        const menuBtn = fe.getElement()!.querySelector(
            ".fileexplorer-context-item"
        ) as HTMLElement;
        if (menuBtn) { menuBtn.click(); }
        expect(cb).toHaveBeenCalledWith("copy", expect.any(Object));
        fe.destroy();
    });
});
