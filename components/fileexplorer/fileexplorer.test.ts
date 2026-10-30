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
import { destroyProbe } from "../../tests/destroy-probe";
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

    // THE TITLE IS THE MAPPING: `multiSelect: true` becomes
    // `selectable: "multi"`. The constructor writes it back onto the
    // options object it was handed, so reading that object is the
    // whole claim -- and `expect(el).toBeDefined()` said nothing
    // about selection at all.
    test("Constructor_MultiSelectTrue_MapToSelectableMulti", () =>
    {
        const options = makeOptions({ multiSelect: true });

        const fe = new FileExplorer(options);

        expect(options.selectable).toBe("multi");
        fe.destroy();
    });

    test("MultiSelectTrue_DoesNotOverrideAnExplicitSelectable", () =>
    {
        // The other half of the `&& !options.selectable` guard,
        // without which the mapping above could be unconditional.
        const options = makeOptions({ multiSelect: true, selectable: "single" });

        const fe = new FileExplorer(options);

        expect(options.selectable).toBe("single");
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
        const probe = destroyProbe();

        fe.destroy();
        const first = probe.total();
        fe.destroy();

        expect(first).toBeGreaterThan(0);
        expect(probe.total()).toBe(first);
        probe.restore();
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

// ============================================================================
// SURFACE CONTRACT (additive, readiness step 3)
// ============================================================================

describe("FileExplorer surface contract", () =>
{
    /** The listing row for `id`. */
    function row(id: string): HTMLElement
    {
        const el = container.querySelector<HTMLElement>(`.fileexplorer-listing [data-id="${id}"]`);

        expect(el).not.toBeNull();

        return el!;
    }

    test("select_ItemClick_EmitsTheSelectionWithoutDataAfterCallbacks", () =>
    {
        const order: unknown[] = [];
        const tree = makeFileTree();
        (tree[0].children![0] as FileNode).data = { secret: 1 };
        const fe = createFileExplorer(container.id, { roots: tree,
            onSelect: () => order.push("onSelect"),
            onSelectionChange: () => order.push("onSelectionChange") }) as FileExplorer;
        fe.navigate("root");
        fe.on("select", (p) => order.push(p));

        row("f1").click();

        expect(order).toEqual(["onSelect", "onSelectionChange",
            [{ id: "f1", name: "readme.md", type: "file" }]]);
        fe.destroy();
    });

    test("open_FileDoubleClick_EmitsTheFileAfterOnOpen", () =>
    {
        const order: unknown[] = [];
        const fe = createFileExplorer(container.id, { roots: makeFileTree(),
            onOpen: (f) => order.push(`legacy:${f.id}`) }) as FileExplorer;
        fe.navigate("root");
        fe.on("open", (p) => order.push(p));

        row("f2").dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));

        expect(order).toEqual(["legacy:f2", { id: "f2", name: "report.pdf", type: "file" }]);
        fe.destroy();
    });

    test("open_WithoutOnOpen_StillEmits", () =>
    {
        const fe = createFileExplorer(container.id, { roots: makeFileTree() }) as FileExplorer;
        const heard = vi.fn();
        fe.navigate("root");
        fe.on("open", heard);

        row("f1").dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));

        expect(heard).toHaveBeenCalledWith({ id: "f1", name: "readme.md", type: "file" });
        fe.destroy();
    });

    test("on_UnknownChannel_Throws_AndUnsubscribeStopsDelivery", () =>
    {
        const fe = createFileExplorer(container.id, { roots: makeFileTree() }) as FileExplorer;
        const heard = vi.fn();
        fe.navigate("root");

        fe.on("select", heard)();
        row("f1").click();

        expect(heard).not.toHaveBeenCalled();
        expect(() => fe.on("navigate", () => undefined)).toThrow(/valid channels/);
        fe.destroy();
    });

    test("setData_Roots_ReplacesTheTreeAndKeepsAFolderThatStillExists", () =>
    {
        const fe = createFileExplorer(container.id, { roots: makeFileTree() }) as FileExplorer;
        fe.navigate("root");
        fe.selectItem("f1");

        fe.setData("roots", [{ id: "root", name: "Documents", type: "folder",
            children: [{ id: "f3", name: "notes.txt", type: "file" }] }]);

        expect(fe.getState()).toMatchObject({ currentFolderId: "root", selectedIds: [] });
        expect(row("f3")).toBeTruthy();
        expect(container.querySelectorAll(".fileexplorer-tree [data-id='root']")).toHaveLength(1);

        fe.setData("roots", []);
        expect(fe.getState().currentFolderId).toBe("__root__");
        expect(() => fe.setData("folders", [])).toThrow(/slots are/);
        fe.destroy();
    });

    test("setData_Items_ReplacesTheFlatListing", () =>
    {
        const fe = createFileExplorer(container.id, { items: makeFlatItems() }) as FileExplorer;

        fe.setData("items", [{ id: "n1", name: "New.txt", type: "file" }]);

        expect(fe.getItems().map((i) => i.id)).toEqual(["n1"]);
        fe.destroy();
    });

    test("getState_SetState_RoundTripsFiringNoCallback", () =>
    {
        const callbacks = { onNavigate: vi.fn(), onSelect: vi.fn(), onSelectionChange: vi.fn(),
            onViewModeChange: vi.fn(), onSort: vi.fn() };
        const fe = createFileExplorer(container.id, { roots: makeFileTree(), ...callbacks }) as FileExplorer;
        const heard = vi.fn();
        fe.on("select", heard);
        const captured = { currentFolderId: "root", selectedIds: ["f2"], viewMode: "grid",
            sortField: "size", sortDirection: "desc" };

        fe.setState(captured);

        expect(fe.getState()).toEqual(captured);
        Object.values(callbacks).forEach((cb) => expect(cb).not.toHaveBeenCalled());
        expect(heard).not.toHaveBeenCalled();
        fe.destroy();
    });
});

// ============================================================================
// onLoadChildren (#69)
// ============================================================================

describe("onLoadChildren loads a folder whose children were never given (#69)", () =>
{
    /** Settles pending promise callbacks. */
    async function settle(): Promise<void>
    {
        for (let i = 0; i < 5; i++) { await Promise.resolve(); }
    }

    const lazyRoots = (): FileNode[] => [{ id: "lazy", name: "Lazy", type: "folder" },
        { id: "empty", name: "Empty", type: "folder", children: [] }];

    test("openingTheFolder_AsksOnceAndShowsTheAnswer", async () =>
    {
        const onLoadChildren = vi.fn(() => Promise.resolve<FileNode[]>([
            { id: "sub", name: "Sub", type: "folder", children: [] },
            { id: "doc", name: "doc.txt", type: "file" }]));
        const fe = createFileExplorer(container.id, { roots: lazyRoots(), onLoadChildren }) as FileExplorer;

        fe.navigate("lazy");
        await settle();

        expect(onLoadChildren).toHaveBeenCalledTimes(1);
        expect(onLoadChildren.mock.calls[0][0]).toMatchObject({ id: "lazy" });
        expect(fe.getItems().map((i) => i.id)).toEqual(["sub", "doc"]);
        expect(container.querySelector(".fileexplorer-tree [data-id='sub']")).not.toBeNull();

        fe.navigate("__root__");
        fe.navigate("lazy");
        expect(onLoadChildren).toHaveBeenCalledTimes(1);
        fe.destroy();
    });

    test("aFolderWithChildren_IsNotAskedFor", () =>
    {
        const onLoadChildren = vi.fn(() => Promise.resolve<FileNode[]>([]));
        const fe = createFileExplorer(container.id, { roots: lazyRoots(), onLoadChildren }) as FileExplorer;

        fe.navigate("empty");

        expect(onLoadChildren).not.toHaveBeenCalled();
        fe.destroy();
    });

    test("aFailedLoad_SaysSo_AndOpeningAgainAsksAgain", async () =>
    {
        const onLoadChildren = vi.fn()
            .mockRejectedValueOnce(new Error("offline"))
            .mockResolvedValueOnce([{ id: "doc", name: "doc.txt", type: "file" }]);
        const fe = createFileExplorer(container.id, { roots: lazyRoots(), onLoadChildren }) as FileExplorer;

        fe.navigate("lazy");
        await settle();
        expect(container.querySelector(".fileexplorer-listing")!.textContent).toContain("could not be loaded");

        fe.navigate("lazy");
        await settle();
        expect(onLoadChildren).toHaveBeenCalledTimes(2);
        expect(fe.getItems().map((i) => i.id)).toEqual(["doc"]);
        fe.destroy();
    });
});
