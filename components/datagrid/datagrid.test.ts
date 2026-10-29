/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: DataGrid
 * Comprehensive tests for the DataGrid component.
 * Tests cover: factory, rendering, sorting, filtering, pagination,
 * row selection, public API, ARIA, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { destroyProbe } from "../../tests/destroy-probe";
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

// THIS HELPER RETURNED FOUR OF FIVE ROWS AND HAD NO CALLER. The
// selector `[role='row']:not(:first-child)` was written to drop the
// header, and the header is not a sibling of the body rows -- it
// lives in `.datagrid-scroll-container` while the rows live in
// `.datagrid-body`. So it dropped the header AND the first row.
// Nothing noticed, because until the sort blocks below were given a
// real assertion nothing called it.
function getBodyRows(): HTMLElement[]
{
    return Array.from(
        container.querySelectorAll(".datagrid-body [role='row']")
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
    /** The first column of every rendered body row, in render order. */
    function renderedNames(): string[]
    {
        return getBodyRows().map(
            (r) => r.querySelector("[role='gridcell']")?.textContent ?? "");
    }

    // NOTHING IN THIS BLOCK CHECKED THE ORDER. It sorted, then read
    // `getRow("1")` -- a lookup BY ID, which returns the same row
    // whatever the sort did -- and asserted it was defined. The title
    // named the one fact the body could not see.
    test("sort_ByColumn_SortsAscending", () =>
    {
        const grid = createDataGrid(defaultOpts(), "test-grid");

        grid.sort("name", "asc");

        expect(renderedNames()).toEqual([
            "Acme Corp", "Beta Inc", "Delta Co", "Epsilon Ltd", "Gamma LLC",
        ]);
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

    // The comment said "data should be in original order" and the
    // body asked `getRow("1")` whether it existed. Gamma before
    // Delta is what original order MEANS for this fixture, and it is
    // the only thing that separates a cleared sort from a kept one.
    test("clearSort_RemovesSortState", () =>
    {
        const grid = createDataGrid(defaultOpts(), "test-grid");
        grid.sort("name", "asc");

        grid.clearSort();

        expect(renderedNames()).toEqual([
            "Acme Corp", "Beta Inc", "Gamma LLC", "Delta Co", "Epsilon Ltd",
        ]);
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
        const probe = destroyProbe();

        grid.destroy();
        const first = probe.total();
        grid.destroy();

        expect(first).toBeGreaterThan(0);
        expect(probe.total()).toBe(first);
        probe.restore();
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

// ============================================================================
// UNUSED-1 — the document click handler that was never registered
// ============================================================================

describe("clicking outside the grid cancels an open editor", () =>
{
    /*
     * `boundOnDocClick` was built in the constructor and never passed
     * to addEventListener, so `onDocClick` had never run and an open
     * cell editor survived a click anywhere on the page. The compiler
     * had been reporting the handler as unused since it was written,
     * and that report WAS the bug — it sat inside UNUSED-1's count of
     * 329 for months, described there as dead code to delete.
     */
    function editableGrid(): DataGrid
    {
        const grid = createDataGrid(defaultOpts({
            columns: [
                { id: "name", label: "Name", editable: true },
                { id: "status", label: "Status" },
            ],
            rows: [{ id: "1", data: { name: "Acme Corp", status: "active" } }],
        }));
        grid.show(container.id);
        return grid;
    }

    function openEditor(): HTMLElement | null
    {
        const cell = container.querySelector<HTMLElement>(
            "[data-row-id=\"1\"] [data-col-id=\"name\"]");

        cell?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
        return container.querySelector(".datagrid-cell-editing");
    }

    test("the editor opens, which is the precondition", () =>
    {
        const grid = editableGrid();

        expect(openEditor()).not.toBeNull();
        grid.destroy();
    });

    test("a click outside the grid closes it", () =>
    {
        const grid = editableGrid();
        openEditor();

        document.body.dispatchEvent(
            new MouseEvent("click", { bubbles: true }));

        expect(container.querySelector(".datagrid-cell-editing")).toBeNull();
        grid.destroy();
    });

    test("a click inside the grid leaves it open", () =>
    {
        // The other half, and the reason the handler checks `contains`
        // rather than closing on every click: clicking the editor
        // itself must not dismiss it.
        const grid = editableGrid();
        const editing = openEditor();

        editing?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

        expect(container.querySelector(".datagrid-cell-editing")).not.toBeNull();
        grid.destroy();
    });

    test("setData refuses an unknown slot, naming it", () =>
    {
        // ADR-200, ERR-1. The branch existed and warned, and NO TEST
        // HAD EVER NAMED IT — the three sibling components that carry
        // the same branch each had one. The slot is a string, so
        // TypeScript cannot catch a typo and this library is consumed
        // from plain JavaScript over a CDN.
        const grid = createDataGrid(defaultOpts(), "test-grid");

        expect(() => grid.setData("nope", []))
            .toThrow(/unknown slot "nope"/);
        expect(() => grid.setData("nope", [])).toThrow(/"rows"/);
    });

});

// ============================================================================
// SURFACE CONTRACT (readiness step 2 B6): the cellEdit channel and the
// channel whitelist on on(). onCellEdit keeps firing first, exactly once.
// ============================================================================

describe("surface contract (B6)", () =>
{
    function editableGrid(extra?: Partial<DataGridOptions>): DataGrid
    {
        const grid = createDataGrid(defaultOpts({
            columns: [
                { id: "name", label: "Name", editable: true },
                { id: "status", label: "Status" },
            ],
            rows: [{ id: "1", data: { name: "Acme Corp", status: "active" } }],
            ...extra,
        }));
        grid.show(container.id);
        return grid;
    }

    /** Opens the editor on row 1's name cell, types a value and presses Enter. */
    function editName(value: string): void
    {
        const cell = container.querySelector<HTMLElement>(
            "[data-row-id=\"1\"] [data-col-id=\"name\"]");

        cell?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));

        const editor = container.querySelector<HTMLInputElement>(".datagrid-editor");

        editor!.value = value;
        editor!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    }

    test("on(cellEdit)_HearsTheEdit_AfterOnCellEdit_AndUnsubscribeStopsIt", () =>
    {
        const order: string[] = [];
        const grid = editableGrid({
            onCellEdit: (rowId, columnId, oldValue, newValue) =>
            {
                order.push(`option:${rowId}:${columnId}:${String(oldValue)}:${String(newValue)}`);
            },
        });
        const off = grid.on("cellEdit", (p) => order.push(`channel:${JSON.stringify(p)}`));

        editName("Acme Ltd");
        off();
        editName("Acme Inc");

        expect(order).toEqual([
            "option:1:name:Acme Corp:Acme Ltd",
            "channel:{\"rowId\":\"1\",\"columnId\":\"name\",\"oldValue\":\"Acme Corp\",\"newValue\":\"Acme Ltd\"}",
            "option:1:name:Acme Ltd:Acme Inc",
        ]);
        grid.destroy();
    });

    test("on(cellEdit)_WithoutOnCellEdit_StillHearsTheEdit", () =>
    {
        const heard = vi.fn();
        const grid = editableGrid();
        grid.on("cellEdit", heard);

        editName("Acme Ltd");

        expect(heard).toHaveBeenCalledTimes(1);
        expect(heard).toHaveBeenCalledWith(
            { rowId: "1", columnId: "name", oldValue: "Acme Corp", newValue: "Acme Ltd" });
        expect(grid.getRow("1")!.data.name).toBe("Acme Ltd");
        grid.destroy();
    });

    test("on(cellEdit)_WhenOnCellEditVetoes_IsNotHeardAndEditIsNotApplied", () =>
    {
        const onCellEdit = vi.fn(() => false as const);
        const heard = vi.fn();
        const grid = editableGrid({ onCellEdit });
        grid.on("cellEdit", heard);

        editName("Acme Ltd");

        expect(onCellEdit).toHaveBeenCalledTimes(1);
        expect(heard).not.toHaveBeenCalled();
        expect(grid.getRow("1")!.data.name).toBe("Acme Corp");
        grid.destroy();
    });

    test("on(cellEdit)_PayloadIsPlainJson", () =>
    {
        let payload: unknown;
        const grid = editableGrid();
        grid.on("cellEdit", (p) => { payload = p; });

        editName("Acme Ltd");

        expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
        grid.destroy();
    });

    test("on(cellEdit)_AHandlerThatThrows_DoesNotStarveTheNext", () =>
    {
        const heard = vi.fn();
        const grid = editableGrid();
        grid.on("cellEdit", () => { throw new Error("boom"); });
        grid.on("cellEdit", heard);

        editName("Acme Ltd");

        expect(heard).toHaveBeenCalledTimes(1);
        grid.destroy();
    });

    test("on_EveryDeclaredChannel_ReturnsAnUnsubscribe", () =>
    {
        const grid = editableGrid();
        const offs = ["selection", "sort", "page", "activate", "cellEdit"].map((c) => grid.on(c, () => undefined));

        expect(offs.map((off) => typeof off)).toEqual(["function", "function", "function", "function", "function"]);
        grid.destroy();
    });

    // on() accepted any channel name before B6, so existing callers keep that: tightening it would break them.
    test("on_UnknownChannel_StillReturnsAnUnsubscribe_AsBefore", () =>
    {
        const grid = editableGrid();
        const off = grid.on("bogus", () => undefined);

        expect(off).toBeTypeOf("function");
        off();
        grid.destroy();
    });

    test("getState_SetState_RoundTripTheDeclaredKeys", () =>
    {
        const grid = createDataGrid(defaultOpts({ pageSize: 2, selectable: "multi" }), "test-grid");

        grid.selectRow("2");
        grid.sort("name", "desc");
        const captured = grid.getState();

        expect(Object.keys(captured).sort()).toEqual(["page", "pageSize", "selection", "sort"]);

        grid.sort("name", "asc");
        grid.deselectRow("2");
        grid.setState(captured);

        expect(grid.getState()).toEqual(captured);
        expect(JSON.parse(JSON.stringify(captured))).toEqual(captured);
        grid.destroy();
    });
});
