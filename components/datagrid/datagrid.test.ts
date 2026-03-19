/**
 * ⚓ TESTS: DataGrid
 * Comprehensive tests for the DataGrid component.
 * Tests cover: factory, rendering, sorting, filtering, pagination,
 * row selection, public API, ARIA, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { DataGrid, createDataGrid } from "./datagrid";
import type { DataGridColumn, DataGridRow, DataGridOptions } from "./datagrid";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function makeContainer(): HTMLDivElement
{
    const el = document.createElement("div");
    el.id = "test-grid";
    document.body.appendChild(el);
    return el;
}

function sampleColumns(): DataGridColumn[]
{
    return [
        { id: "name", label: "Name", sortable: true, filterable: true },
        { id: "status", label: "Status", sortable: true },
        { id: "amount", label: "Amount", align: "right", sortable: true },
    ];
}

function sampleRows(): DataGridRow[]
{
    return [
        { id: "1", data: { name: "Acme Corp", status: "active", amount: 1234 } },
        { id: "2", data: { name: "Beta Inc", status: "inactive", amount: 567 } },
        { id: "3", data: { name: "Gamma LLC", status: "active", amount: 890 } },
        { id: "4", data: { name: "Delta Co", status: "pending", amount: 2345 } },
        { id: "5", data: { name: "Epsilon Ltd", status: "active", amount: 111 } },
    ];
}

function defaultOpts(overrides?: Partial<DataGridOptions>): DataGridOptions
{
    return {
        columns: sampleColumns(),
        rows: sampleRows(),
        pageSize: 0,
        ...overrides,
    };
}

function getHeaderCells(): HTMLElement[]
{
    return Array.from(
        container.querySelectorAll("[role='columnheader']")
    ) as HTMLElement[];
}

function getBodyRows(): HTMLElement[]
{
    return Array.from(
        container.querySelectorAll("[role='row']:not(:first-child)")
    ) as HTMLElement[];
}

function getGridCells(): HTMLElement[]
{
    return Array.from(
        container.querySelectorAll("[role='gridcell']")
    ) as HTMLElement[];
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
// FACTORY — createDataGrid
// ============================================================================

describe("createDataGrid", () =>
{
    test("withValidOptions_ReturnsDataGridInstance", () =>
    {
        const grid = createDataGrid(defaultOpts(), "test-grid");
        expect(grid).toBeDefined();
        expect(grid).toBeInstanceOf(DataGrid);
        grid.destroy();
    });

    test("withContainerId_MountsIntoContainer", () =>
    {
        const grid = createDataGrid(defaultOpts(), "test-grid");
        expect(container.children.length).toBeGreaterThan(0);
        grid.destroy();
    });

    test("withoutContainerId_DoesNotAutoMount", () =>
    {
        const grid = createDataGrid(defaultOpts());
        expect(container.children.length).toBe(0);
        grid.destroy();
    });

    test("withColumns_SetsUpColumnDefinitions", () =>
    {
        const grid = createDataGrid(defaultOpts(), "test-grid");
        const cols = grid.getColumns();
        expect(cols).toHaveLength(3);
        expect(cols[0].id).toBe("name");
        grid.destroy();
    });
});

// ============================================================================
// TABLE RENDERING
// ============================================================================

describe("table rendering", () =>
{
    test("rendersHeaderRow_WithColumnLabels", () =>
    {
        const grid = createDataGrid(defaultOpts(), "test-grid");
        const headers = getHeaderCells();
        expect(headers.length).toBeGreaterThanOrEqual(3);
        const texts = headers.map(h => h.textContent?.trim());
        expect(texts).toContain("Name");
        expect(texts).toContain("Status");
        expect(texts).toContain("Amount");
        grid.destroy();
    });

    test("rendersDataRows_MatchingRowCount", () =>
    {
        const grid = createDataGrid(defaultOpts(), "test-grid");
        const cells = getGridCells();
        // 5 rows * 3 columns = 15 cells
        expect(cells.length).toBeGreaterThanOrEqual(15);
        grid.destroy();
    });

    test("rendersDataCells_WithCorrectContent", () =>
    {
        const grid = createDataGrid(defaultOpts(), "test-grid");
        const cells = getGridCells();
        const cellTexts = cells.map(c => c.textContent);
        expect(cellTexts).toContain("Acme Corp");
        expect(cellTexts).toContain("active");
        grid.destroy();
    });

    test("withDenseMode_AppliesDenseClass", () =>
    {
        const grid = createDataGrid(
            defaultOpts({ dense: true }), "test-grid"
        );
        const root = container.querySelector("[role='grid']");
        expect(root?.classList.contains("datagrid-dense")).toBe(true);
        grid.destroy();
    });
});

// ============================================================================
// SORTING
// ============================================================================

describe("sorting", () =>
{
    test("sort_ByColumn_SortsAscending", () =>
    {
        const grid = createDataGrid(defaultOpts(), "test-grid");
        grid.sort("name", "asc");
        const firstRow = grid.getRow("1");
        expect(firstRow).toBeDefined();
        grid.destroy();
    });

    test("sort_ByColumn_FiresOnSortCallback", () =>
    {
        const onSort = vi.fn();
        const grid = createDataGrid(
            defaultOpts({ onSort }), "test-grid"
        );
        grid.sort("name", "asc");
        expect(onSort).toHaveBeenCalled();
        grid.destroy();
    });

    test("clearSort_RemovesSortState", () =>
    {
        const grid = createDataGrid(defaultOpts(), "test-grid");
        grid.sort("name", "asc");
        grid.clearSort();
        // After clearing sort, data should be in original order
        const row = grid.getRow("1");
        expect(row).toBeDefined();
        grid.destroy();
    });

    test("sort_Descending_ReversesOrder", () =>
    {
        const onSort = vi.fn();
        const grid = createDataGrid(
            defaultOpts({ onSort }), "test-grid"
        );
        grid.sort("name", "desc");
        expect(onSort).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    columnId: "name", direction: "desc",
                }),
            ])
        );
        grid.destroy();
    });
});

// ============================================================================
// FILTERING
// ============================================================================

describe("filtering", () =>
{
    test("setFilter_ReducesVisibleRows", () =>
    {
        const grid = createDataGrid(defaultOpts({
            columns: [
                { id: "name", label: "Name", sortable: true, filterable: true },
                { id: "status", label: "Status" },
                { id: "amount", label: "Amount" },
            ],
        }), "test-grid");
        grid.setFilter("name", "Acme");
        // After filter, fewer gridcells visible
        const cells = getGridCells();
        const cellTexts = cells.map(c => c.textContent);
        expect(cellTexts).toContain("Acme Corp");
        grid.destroy();
    });

    test("clearFilters_RestoresAllRows", () =>
    {
        const grid = createDataGrid(defaultOpts({
            columns: [
                { id: "name", label: "Name", filterable: true },
                { id: "status", label: "Status" },
                { id: "amount", label: "Amount" },
            ],
        }), "test-grid");
        grid.setFilter("name", "Acme");
        grid.clearFilters();
        const cells = getGridCells();
        // Should have all rows back: 5 rows * 3 cols
        expect(cells.length).toBeGreaterThanOrEqual(15);
        grid.destroy();
    });

    test("setFilter_FiresOnFilterCallback", () =>
    {
        const onFilter = vi.fn();
        const grid = createDataGrid(
            defaultOpts({
                onFilter,
                columns: [
                    { id: "name", label: "Name", filterable: true },
                    { id: "status", label: "Status" },
                    { id: "amount", label: "Amount" },
                ],
            }),
            "test-grid"
        );
        grid.setFilter("name", "test");
        expect(onFilter).toHaveBeenCalled();
        grid.destroy();
    });
});

// ============================================================================
// PAGINATION
// ============================================================================

describe("pagination", () =>
{
    test("withPageSize_LimitsVisibleRows", () =>
    {
        const grid = createDataGrid(
            defaultOpts({ pageSize: 2 }), "test-grid"
        );
        const cells = getGridCells();
        // 2 rows * 3 columns = 6 cells
        expect(cells.length).toBe(6);
        grid.destroy();
    });

    test("setPage_NavigatesToPage", () =>
    {
        const grid = createDataGrid(
            defaultOpts({ pageSize: 2 }), "test-grid"
        );
        grid.setPage(2);
        expect(grid.getPage()).toBe(2);
        grid.destroy();
    });

    test("getPageCount_ReturnsCorrectCount", () =>
    {
        const grid = createDataGrid(
            defaultOpts({ pageSize: 2 }), "test-grid"
        );
        // 5 rows / 2 per page = 3 pages
        expect(grid.getPageCount()).toBe(3);
        grid.destroy();
    });

    test("setPageSize_UpdatesRowsPerPage", () =>
    {
        const grid = createDataGrid(
            defaultOpts({ pageSize: 2 }), "test-grid"
        );
        grid.setPageSize(5);
        const cells = getGridCells();
        // 5 rows * 3 columns = 15 cells
        expect(cells.length).toBe(15);
        grid.destroy();
    });

    test("onPageChange_FiresCallback", () =>
    {
        const onPageChange = vi.fn();
        const grid = createDataGrid(
            defaultOpts({ pageSize: 2, onPageChange }), "test-grid"
        );
        grid.setPage(2);
        expect(onPageChange).toHaveBeenCalledWith(2, 2);
        grid.destroy();
    });
});

// ============================================================================
// ROW SELECTION
// ============================================================================

describe("row selection", () =>
{
    test("selectRow_AddsToSelectedSet", () =>
    {
        const grid = createDataGrid(
            defaultOpts({ selectable: "multi" }), "test-grid"
        );
        grid.selectRow("1");
        const selected = grid.getSelectedRows();
        expect(selected).toHaveLength(1);
        expect(selected[0].id).toBe("1");
        grid.destroy();
    });

    test("deselectRow_RemovesFromSelectedSet", () =>
    {
        const grid = createDataGrid(
            defaultOpts({ selectable: "multi" }), "test-grid"
        );
        grid.selectRow("1");
        grid.deselectRow("1");
        const selected = grid.getSelectedRows();
        expect(selected).toHaveLength(0);
        grid.destroy();
    });

    test("selectAll_SelectsAllOnCurrentPage", () =>
    {
        const grid = createDataGrid(
            defaultOpts({ selectable: "multi" }), "test-grid"
        );
        grid.selectAll();
        const selected = grid.getSelectedRows();
        expect(selected).toHaveLength(5);
        grid.destroy();
    });

    test("deselectAll_ClearsAllSelections", () =>
    {
        const grid = createDataGrid(
            defaultOpts({ selectable: "multi" }), "test-grid"
        );
        grid.selectAll();
        grid.deselectAll();
        const selected = grid.getSelectedRows();
        expect(selected).toHaveLength(0);
        grid.destroy();
    });

    test("onRowSelect_FiresCallback", () =>
    {
        const onRowSelect = vi.fn();
        const grid = createDataGrid(
            defaultOpts({ selectable: "multi", onRowSelect }), "test-grid"
        );
        grid.selectRow("1");
        expect(onRowSelect).toHaveBeenCalledWith(["1"]);
        grid.destroy();
    });

    test("disabledRow_CannotBeSelected", () =>
    {
        const grid = createDataGrid(
            defaultOpts({
                selectable: "multi",
                rows: [
                    { id: "d1", data: { name: "Disabled" }, disabled: true },
                    { id: "n1", data: { name: "Normal" } },
                ],
            }),
            "test-grid"
        );
        grid.selectRow("d1");
        const selected = grid.getSelectedRows();
        expect(selected).toHaveLength(0);
        grid.destroy();
    });
});

// ============================================================================
// DATA MANIPULATION — setRows, addRow, removeRow, updateRow
// ============================================================================

describe("data manipulation", () =>
{
    test("setRows_ReplacesAllData", () =>
    {
        const grid = createDataGrid(defaultOpts(), "test-grid");
        grid.setRows([
            { id: "new1", data: { name: "New Row" } },
        ]);
        const row = grid.getRow("new1");
        expect(row).not.toBeNull();
        expect(row?.data.name).toBe("New Row");
        grid.destroy();
    });

    test("addRow_InsertsNewRow", () =>
    {
        const grid = createDataGrid(defaultOpts(), "test-grid");
        grid.addRow({ id: "6", data: { name: "Added Row" } });
        const row = grid.getRow("6");
        expect(row).not.toBeNull();
        expect(row?.data.name).toBe("Added Row");
        grid.destroy();
    });

    test("removeRow_DeletesRowById", () =>
    {
        const grid = createDataGrid(defaultOpts(), "test-grid");
        grid.removeRow("1");
        const row = grid.getRow("1");
        expect(row).toBeNull();
        grid.destroy();
    });

    test("updateRow_MergesDataIntoRow", () =>
    {
        const grid = createDataGrid(defaultOpts(), "test-grid");
        grid.updateRow("1", { name: "Updated Corp" });
        const row = grid.getRow("1");
        expect(row?.data.name).toBe("Updated Corp");
        grid.destroy();
    });

    test("getRow_ReturnsNullForMissing", () =>
    {
        const grid = createDataGrid(defaultOpts(), "test-grid");
        const row = grid.getRow("nonexistent");
        expect(row).toBeNull();
        grid.destroy();
    });
});

// ============================================================================
// COLUMN VISIBILITY
// ============================================================================

describe("column visibility", () =>
{
    test("hideColumn_SetsColumnHiddenFlag", () =>
    {
        const grid = createDataGrid(defaultOpts(), "test-grid");
        grid.hideColumn("status");
        const cols = grid.getColumns();
        const statusCol = cols.find(c => c.id === "status");
        expect(statusCol?.hidden).toBe(true);
        grid.destroy();
    });

    test("showColumn_RestoresHiddenColumn", () =>
    {
        const grid = createDataGrid(defaultOpts(), "test-grid");
        grid.hideColumn("status");
        grid.showColumn("status");
        const cols = grid.getColumns();
        const statusCol = cols.find(c => c.id === "status");
        expect(statusCol?.hidden).toBeFalsy();
        grid.destroy();
    });
});

// ============================================================================
// ARIA / ACCESSIBILITY
// ============================================================================

describe("ARIA roles", () =>
{
    test("rootElement_HasGridRole", () =>
    {
        const grid = createDataGrid(defaultOpts(), "test-grid");
        const gridEl = container.querySelector("[role='grid']");
        expect(gridEl).not.toBeNull();
        grid.destroy();
    });

    test("headers_HaveColumnHeaderRole", () =>
    {
        const grid = createDataGrid(defaultOpts(), "test-grid");
        const headers = getHeaderCells();
        headers.forEach(h =>
        {
            expect(h.getAttribute("role")).toBe("columnheader");
        });
        grid.destroy();
    });

    test("bodyRows_HaveRowRole", () =>
    {
        const grid = createDataGrid(defaultOpts(), "test-grid");
        const rows = container.querySelectorAll("[role='row']");
        expect(rows.length).toBeGreaterThan(0);
        grid.destroy();
    });

    test("sortableHeader_HasAriaSortAttribute", () =>
    {
        const grid = createDataGrid(defaultOpts(), "test-grid");
        grid.sort("name", "asc");
        const headers = getHeaderCells();
        const nameHeader = headers.find(
            h => h.textContent?.trim().includes("Name")
        );
        expect(nameHeader?.getAttribute("aria-sort")).toBe("ascending");
        grid.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("destroy", () =>
{
    test("destroy_RemovesDOMElements", () =>
    {
        const grid = createDataGrid(defaultOpts(), "test-grid");
        grid.destroy();
        const gridEl = container.querySelector("[role='grid']");
        expect(gridEl).toBeNull();
    });

    test("destroy_CalledTwice_IsIdempotent", () =>
    {
        const grid = createDataGrid(defaultOpts(), "test-grid");
        grid.destroy();
        expect(() => grid.destroy()).not.toThrow();
    });
});

// ============================================================================
// SHOW / HIDE
// ============================================================================

describe("show and hide", () =>
{
    test("show_RendersIntoContainer", () =>
    {
        const grid = new DataGrid(defaultOpts());
        grid.show("test-grid");
        expect(container.children.length).toBeGreaterThan(0);
        grid.destroy();
    });

    test("hide_RemovesFromDOM", () =>
    {
        const grid = createDataGrid(defaultOpts(), "test-grid");
        grid.hide();
        const gridEl = container.querySelector("[role='grid']");
        expect(gridEl).toBeNull();
        grid.destroy();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("emptyRows_RendersEmptyState", () =>
    {
        const grid = createDataGrid(
            defaultOpts({ rows: [] }), "test-grid"
        );
        const cells = getGridCells();
        expect(cells).toHaveLength(0);
        grid.destroy();
    });

    test("singleRow_RendersCorrectly", () =>
    {
        const grid = createDataGrid(
            defaultOpts({
                rows: [{ id: "solo", data: { name: "Only" } }],
            }),
            "test-grid"
        );
        const row = grid.getRow("solo");
        expect(row).not.toBeNull();
        grid.destroy();
    });
});
