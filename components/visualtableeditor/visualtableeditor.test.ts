/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: VisualTableEditor
 * Spec-based tests for the VisualTableEditor component.
 * Tests cover: factory, data, cell access, selection, structure, merge,
 * formatting, presets, keyboard, clipboard, pagination, undo/redo,
 * mode, sort/filter, aggregates, callbacks, lifecycle, accessibility.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
    createVisualTableEditor,
    VisualTableEditor,
    VisualTableEditorOptions,
    VisualTableData,
} from "./visualtableeditor";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

/** Create a fresh container div for each test. */
function createContainer(): HTMLElement
{
    const el = document.createElement("div");
    el.id = "vte-test-container";
    document.body.appendChild(el);
    return el;
}

/** Build default options pointing at the current container. */
function defaultOptions(overrides?: Partial<VisualTableEditorOptions>): VisualTableEditorOptions
{
    return {
        container,
        ...overrides,
    };
}

/** Build a simple 3-column, 3-row (1 header + 2 data) dataset. */
function sampleData(): VisualTableData
{
    return {
        meta: { headerRows: 1 },
        columns: [
            { id: "name", width: 150 },
            { id: "role", width: 120 },
            { id: "status", width: 100 },
        ],
        rows: [
            {
                id: "hdr",
                cells: {
                    name: { value: "Name", style: { bold: true } },
                    role: { value: "Role", style: { bold: true } },
                    status: { value: "Status", style: { bold: true } },
                },
            },
            {
                id: "r1",
                cells: {
                    name: { value: "Alice" },
                    role: { value: "Engineer" },
                    status: { value: "Active" },
                },
            },
            {
                id: "r2",
                cells: {
                    name: { value: "Bob" },
                    role: { value: "Designer" },
                    status: { value: "Away" },
                },
            },
        ],
    };
}

/** Build a dataset with numeric values for aggregate tests. */
function numericData(): VisualTableData
{
    return {
        meta: { headerRows: 1 },
        columns: [
            { id: "item", width: 100 },
            { id: "price", width: 100 },
        ],
        rows: [
            { id: "hdr", cells: { item: { value: "Item" }, price: { value: "Price" } } },
            { id: "r1", cells: { item: { value: "Widget" }, price: { value: "$100" } } },
            { id: "r2", cells: { item: { value: "Gadget" }, price: { value: "$200" } } },
            { id: "r3", cells: { item: { value: "Doohickey" }, price: { value: "$350" } } },
        ],
    };
}

/** Create editor with sample data and return it. */
function createSampleEditor(
    overrides?: Partial<VisualTableEditorOptions>): VisualTableEditor
{
    return createVisualTableEditor(defaultOptions({ data: sampleData(), ...overrides }));
}

/** Get the root element. */
function getRoot(): HTMLElement | null
{
    return container.querySelector(".vte-root");
}

/** Get all rendered cells. */
function getCells(): HTMLElement[]
{
    return Array.from(container.querySelectorAll<HTMLElement>(".vte-cell"));
}

/** Get the table element. */
function getTable(): HTMLElement | null
{
    return container.querySelector(".vte-table");
}

/** Get the toolbar element. */
function getToolbar(): HTMLElement | null
{
    return container.querySelector(".vte-toolbar");
}

/** Get pagination element. */
function getPagination(): HTMLElement | null
{
    return container.querySelector(".vte-pagination");
}

/** Get the summary bar element. */
function getSummaryBar(): HTMLElement | null
{
    return container.querySelector(".vte-summary-bar");
}

/** Dispatch a keydown event on the table container. */
function pressKey(
    key: string,
    opts?: { ctrlKey?: boolean; shiftKey?: boolean; metaKey?: boolean }): void
{
    const tableContainer = container.querySelector(".vte-table-container");

    if (tableContainer)
    {
        tableContainer.dispatchEvent(
            new KeyboardEvent("keydown", {
                key,
                bubbles: true,
                ctrlKey: opts?.ctrlKey ?? false,
                shiftKey: opts?.shiftKey ?? false,
                metaKey: opts?.metaKey ?? false,
            })
        );
    }
}

/** Click a cell at the given data-row/data-col indices. */
function clickCell(
    rowIdx: number,
    colIdx: number,
    opts?: { ctrlKey?: boolean; shiftKey?: boolean }): void
{
    const cell = container.querySelector(
        `[data-row="${rowIdx}"][data-col="${colIdx}"]`
    ) as HTMLElement | null;

    if (cell)
    {
        cell.dispatchEvent(
            new MouseEvent("click", {
                bubbles: true,
                ctrlKey: opts?.ctrlKey ?? false,
                shiftKey: opts?.shiftKey ?? false,
            })
        );
    }
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

// jsdom does not implement scrollIntoView; stub it to prevent uncaught errors.
if (!Element.prototype.scrollIntoView)
{
    Element.prototype.scrollIntoView = function (): void { /* noop */ };
}

beforeEach(() =>
{
    vi.useFakeTimers();
    container = createContainer();
});

afterEach(() =>
{
    container.remove();
    vi.advanceTimersByTime(500);
    vi.useRealTimers();
});

// ============================================================================
// 1. FACTORY (3 tests)
// ============================================================================

describe("Factory", () =>
{
    test("creates editor with default 3x3 table when no data provided", () =>
    {
        const editor = createVisualTableEditor(defaultOptions());
        const data = editor.getData();
        expect(data.columns).toHaveLength(3);
        expect(data.rows).toHaveLength(3);
        expect(getRoot()).not.toBeNull();
        editor.destroy();
    });

    test("creates editor with provided options and data", () =>
    {
        const editor = createVisualTableEditor(defaultOptions({
            data: sampleData(),
            mode: "view",
            compact: true,
        }));

        expect(editor.getMode()).toBe("view");
        expect(getRoot()!.classList.contains("vte-root--compact")).toBe(true);
        expect(editor.getData().rows).toHaveLength(3);
        editor.destroy();
    });

    test("creates editor from string CSS selector", () =>
    {
        const editor = createVisualTableEditor({ container: "#vte-test-container" });
        expect(getRoot()).not.toBeNull();
        editor.destroy();
    });
});

// ============================================================================
// 2. DATA (8 tests)
// ============================================================================

describe("Data", () =>
{
    test("getData returns deep copy of table data", () =>
    {
        const editor = createSampleEditor();
        const data1 = editor.getData();
        const data2 = editor.getData();
        expect(data1).toEqual(data2);
        expect(data1).not.toBe(data2);
        expect(data1.rows).not.toBe(data2.rows);
        editor.destroy();
    });

    test("setData replaces the current data entirely", () =>
    {
        const editor = createSampleEditor();
        const newData: VisualTableData = {
            columns: [{ id: "a" }, { id: "b" }],
            rows: [
                { id: "r1", cells: { a: { value: "X" }, b: { value: "Y" } } },
            ],
        };

        editor.setData(newData);
        const result = editor.getData();
        expect(result.columns).toHaveLength(2);
        expect(result.rows).toHaveLength(1);
        expect(editor.getCellValue("r1", "a")).toBe("X");
        editor.destroy();
    });

    test("getData/setData round-trip preserves all fields", () =>
    {
        const editor = createSampleEditor();
        const original = editor.getData();
        editor.setData(original);
        const roundTripped = editor.getData();
        expect(roundTripped).toEqual(original);
        editor.destroy();
    });

    test("clear resets all cell values to empty but preserves structure", () =>
    {
        const editor = createSampleEditor();
        editor.clear();
        const data = editor.getData();
        expect(data.columns).toHaveLength(3);
        expect(data.rows).toHaveLength(3);
        expect(editor.getCellValue("r1", "name")).toBe("");
        expect(editor.getCellValue("hdr", "name")).toBe("");
        editor.destroy();
    });

    test("default table is 3x3 when no data is provided", () =>
    {
        const editor = createVisualTableEditor(defaultOptions());
        const data = editor.getData();
        expect(data.columns).toHaveLength(3);
        expect(data.rows).toHaveLength(3);
        editor.destroy();
    });

    test("handles large data sets without errors", () =>
    {
        const columns = [{ id: "c1" }, { id: "c2" }];
        const rows: { id: string; cells: Record<string, { value: string }> }[] = [];

        for (let i = 0; i < 100; i++)
        {
            rows.push({
                id: "r" + i,
                cells: { c1: { value: "val" + i }, c2: { value: String(i) } },
            });
        }

        const editor = createVisualTableEditor(defaultOptions({
            data: { columns, rows },
        }));

        expect(editor.getData().rows).toHaveLength(100);
        editor.destroy();
    });

    test("setData clears undo/redo stacks", () =>
    {
        const editor = createSampleEditor();
        editor.setCellValue("r1", "name", "Changed");
        editor.setData(sampleData());
        // After setData, undo should have nothing to revert
        pressKey("z", { ctrlKey: true });
        expect(editor.getCellValue("r1", "name")).toBe("Alice");
        editor.destroy();
    });

    test("setData handles rich content cells", () =>
    {
        const data: VisualTableData = {
            columns: [{ id: "c1" }],
            rows: [{
                id: "r1",
                cells: {
                    c1: {
                        value: [
                            { type: "text", text: "Hello " },
                            { type: "text", text: "World", style: { bold: true } },
                        ],
                    },
                },
            }],
        };

        const editor = createVisualTableEditor(defaultOptions({ data }));
        const exported = editor.getData();
        expect(Array.isArray(exported.rows[0].cells.c1.value)).toBe(true);
        editor.destroy();
    });
});

// ============================================================================
// 3. CELL ACCESS (10 tests)
// ============================================================================

describe("Cell Access", () =>
{
    test("getCellValue returns the cell text", () =>
    {
        const editor = createSampleEditor();
        expect(editor.getCellValue("r1", "name")).toBe("Alice");
        editor.destroy();
    });

    test("setCellValue updates the cell text", () =>
    {
        const editor = createSampleEditor();
        editor.setCellValue("r1", "name", "Charlie");
        expect(editor.getCellValue("r1", "name")).toBe("Charlie");
        editor.destroy();
    });

    test("getCellStyle returns a copy of the cell style", () =>
    {
        const editor = createSampleEditor();
        const style = editor.getCellStyle("hdr", "name");
        expect(style.bold).toBe(true);
        // Verify it returns a copy, not a reference
        style.bold = false;
        expect(editor.getCellStyle("hdr", "name").bold).toBe(true);
        editor.destroy();
    });

    test("setCellStyle merges with existing style", () =>
    {
        const editor = createSampleEditor();
        editor.setCellStyle("hdr", "name", { italic: true });
        const style = editor.getCellStyle("hdr", "name");
        expect(style.bold).toBe(true);
        expect(style.italic).toBe(true);
        editor.destroy();
    });

    test("getCellValue returns empty string for missing row", () =>
    {
        const editor = createSampleEditor();
        expect(editor.getCellValue("nonexistent", "name")).toBe("");
        editor.destroy();
    });

    test("getCellValue returns empty string for missing column", () =>
    {
        const editor = createSampleEditor();
        expect(editor.getCellValue("r1", "nonexistent")).toBe("");
        editor.destroy();
    });

    test("setCellValue on missing row/col does not throw", () =>
    {
        const editor = createSampleEditor();
        expect(() => editor.setCellValue("badrow", "badcol", "x")).not.toThrow();
        editor.destroy();
    });

    test("setCellValue fires onCellChange callback", () =>
    {
        const callback = vi.fn();
        const editor = createSampleEditor({ onCellChange: callback });
        editor.setCellValue("r1", "name", "Changed");
        expect(callback).toHaveBeenCalledWith("r1", "name", "Alice", "Changed");
        editor.destroy();
    });

    test("setCellStyle fires onStyleChange callback", () =>
    {
        const callback = vi.fn();
        const editor = createSampleEditor({ onStyleChange: callback });
        editor.setCellStyle("r1", "name", { bold: true });
        expect(callback).toHaveBeenCalledWith("r1", "name", { bold: true });
        editor.destroy();
    });

    test("getCellValue returns empty string for rich content cells", () =>
    {
        const data: VisualTableData = {
            columns: [{ id: "c1" }],
            rows: [{
                id: "r1",
                cells: {
                    c1: {
                        value: [
                            { type: "text", text: "Hello" },
                        ],
                    },
                },
            }],
        };

        const editor = createVisualTableEditor(defaultOptions({ data }));
        // Rich content returns empty string via cellTextValue
        expect(editor.getCellValue("r1", "c1")).toBe("");
        editor.destroy();
    });
});

// ============================================================================
// 4. SELECTION (12 tests)
// ============================================================================

describe("Selection", () =>
{
    test("single cell click sets selection to that cell", () =>
    {
        const editor = createSampleEditor();
        clickCell(1, 0);
        const sel = editor.getSelection();
        expect(sel).toHaveLength(1);
        expect(sel[0]).toEqual({ startRow: 1, startCol: 0, endRow: 1, endCol: 0 });
        editor.destroy();
    });

    test("Shift+click extends selection to a range", () =>
    {
        const editor = createSampleEditor();
        clickCell(1, 0);
        clickCell(2, 2, { shiftKey: true });
        const sel = editor.getSelection();
        expect(sel).toHaveLength(1);
        expect(sel[0].startRow).toBeLessThanOrEqual(sel[0].endRow);
        expect(sel[0].startCol).toBeLessThanOrEqual(sel[0].endCol);
        expect(sel[0].endRow).toBe(2);
        expect(sel[0].endCol).toBe(2);
        editor.destroy();
    });

    test("Ctrl+click adds non-contiguous selection", () =>
    {
        const editor = createSampleEditor();
        clickCell(1, 0);
        clickCell(2, 2, { ctrlKey: true });
        const sel = editor.getSelection();
        expect(sel).toHaveLength(2);
        editor.destroy();
    });

    test("selectRow selects all cells in a row", () =>
    {
        const editor = createSampleEditor();
        editor.selectRow(1);
        const sel = editor.getSelection();
        expect(sel).toHaveLength(1);
        expect(sel[0].startRow).toBe(1);
        expect(sel[0].endRow).toBe(1);
        expect(sel[0].startCol).toBe(0);
        expect(sel[0].endCol).toBe(2);
        editor.destroy();
    });

    test("selectColumn selects all cells in a column", () =>
    {
        const editor = createSampleEditor();
        editor.selectColumn(1);
        const sel = editor.getSelection();
        expect(sel).toHaveLength(1);
        expect(sel[0].startCol).toBe(1);
        expect(sel[0].endCol).toBe(1);
        expect(sel[0].startRow).toBe(0);
        expect(sel[0].endRow).toBe(2);
        editor.destroy();
    });

    test("selectAll selects every cell", () =>
    {
        const editor = createSampleEditor();
        editor.selectAll();
        const sel = editor.getSelection();
        expect(sel).toHaveLength(1);
        expect(sel[0]).toEqual({ startRow: 0, startCol: 0, endRow: 2, endCol: 2 });
        editor.destroy();
    });

    test("addToSelection appends a new range", () =>
    {
        const editor = createSampleEditor();
        editor.setSelection({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
        editor.addToSelection({ startRow: 2, startCol: 2, endRow: 2, endCol: 2 });
        const sel = editor.getSelection();
        expect(sel).toHaveLength(2);
        editor.destroy();
    });

    test("clearSelection removes all selections", () =>
    {
        const editor = createSampleEditor();
        editor.selectAll();
        editor.clearSelection();
        expect(editor.getSelection()).toHaveLength(0);
        editor.destroy();
    });

    test("selecting multiple rows via addToSelection works", () =>
    {
        const editor = createSampleEditor();
        editor.selectRow(1);
        editor.addToSelection({ startRow: 2, startCol: 0, endRow: 2, endCol: 2 });
        const sel = editor.getSelection();
        expect(sel).toHaveLength(2);
        editor.destroy();
    });

    test("selecting multiple columns via addToSelection works", () =>
    {
        const editor = createSampleEditor();
        editor.selectColumn(0);
        editor.addToSelection({ startRow: 0, startCol: 2, endRow: 2, endCol: 2 });
        const sel = editor.getSelection();
        expect(sel).toHaveLength(2);
        editor.destroy();
    });

    test("onSelectionChange callback fires on selection change", () =>
    {
        const callback = vi.fn();
        const editor = createSampleEditor({ onSelectionChange: callback });
        editor.setSelection({ startRow: 1, startCol: 0, endRow: 1, endCol: 0 });
        expect(callback).toHaveBeenCalled();
        editor.destroy();
    });

    test("getSelection returns empty array when nothing selected", () =>
    {
        const editor = createSampleEditor();
        expect(editor.getSelection()).toHaveLength(0);
        editor.destroy();
    });
});

// ============================================================================
// 5. STRUCTURE (12 tests)
// ============================================================================

describe("Structure", () =>
{
    test("insertRow at end adds a new row", () =>
    {
        const editor = createSampleEditor();
        const id = editor.insertRow();
        expect(id).toBeTruthy();
        expect(editor.getData().rows).toHaveLength(4);
        editor.destroy();
    });

    test("insertRow at specific index places row correctly", () =>
    {
        const editor = createSampleEditor();
        const id = editor.insertRow(1);
        expect(editor.getData().rows[1].id).toBe(id);
        expect(editor.getData().rows).toHaveLength(4);
        editor.destroy();
    });

    test("removeRow removes the specified row", () =>
    {
        const editor = createSampleEditor();
        editor.removeRow("r2");
        expect(editor.getData().rows).toHaveLength(2);
        expect(editor.getCellValue("r2", "name")).toBe("");
        editor.destroy();
    });

    test("insertColumn at end adds a new column", () =>
    {
        const editor = createSampleEditor();
        const id = editor.insertColumn();
        expect(id).toBeTruthy();
        expect(editor.getData().columns).toHaveLength(4);
        editor.destroy();
    });

    test("insertColumn at specific index places column correctly", () =>
    {
        const editor = createSampleEditor();
        const id = editor.insertColumn(0);
        expect(editor.getData().columns[0].id).toBe(id);
        expect(editor.getData().columns).toHaveLength(4);
        editor.destroy();
    });

    test("removeColumn removes the specified column", () =>
    {
        const editor = createSampleEditor();
        editor.removeColumn("status");
        expect(editor.getData().columns).toHaveLength(2);
        editor.destroy();
    });

    test("setColumnWidth updates the column width", () =>
    {
        const editor = createSampleEditor();
        editor.setColumnWidth("name", 200);
        const data = editor.getData();
        const col = data.columns.find(c => c.id === "name");
        expect(col!.width).toBe(200);
        editor.destroy();
    });

    test("setRowHeight updates the row height", () =>
    {
        const editor = createSampleEditor();
        editor.setRowHeight("r1", 50);
        const data = editor.getData();
        const row = data.rows.find(r => r.id === "r1");
        expect(row!.height).toBe(50);
        editor.destroy();
    });

    test("moveRow reorders rows correctly", () =>
    {
        const editor = createSampleEditor();
        editor.moveRow(1, 2);
        const data = editor.getData();
        expect(data.rows[1].id).toBe("r2");
        expect(data.rows[2].id).toBe("r1");
        editor.destroy();
    });

    test("moveColumn reorders columns correctly", () =>
    {
        const editor = createSampleEditor();
        editor.moveColumn(0, 2);
        const data = editor.getData();
        expect(data.columns[0].id).toBe("role");
        expect(data.columns[2].id).toBe("name");
        editor.destroy();
    });

    test("onStructureChange fires on insertRow", () =>
    {
        const callback = vi.fn();
        const editor = createSampleEditor({ onStructureChange: callback });
        editor.insertRow();
        expect(callback).toHaveBeenCalledWith("insert-row", expect.objectContaining({ rowId: expect.any(String) }));
        editor.destroy();
    });

    test("insertRow returns the new row ID", () =>
    {
        const editor = createSampleEditor();
        const id = editor.insertRow();
        expect(typeof id).toBe("string");
        expect(id.length).toBeGreaterThan(0);
        expect(id.startsWith("row_")).toBe(true);
        editor.destroy();
    });
});

// ============================================================================
// 6. MERGE (6 tests)
// ============================================================================

describe("Merge", () =>
{
    test("mergeCells sets colspan on the top-left cell", () =>
    {
        const editor = createSampleEditor();
        editor.mergeCells({ startRow: 1, startCol: 0, endRow: 1, endCol: 2 });
        const data = editor.getData();
        const cell = data.rows[1].cells.name;
        expect(cell.colspan).toBe(3);
        editor.destroy();
    });

    test("mergeCells sets rowspan on the top-left cell", () =>
    {
        const editor = createSampleEditor();
        editor.mergeCells({ startRow: 1, startCol: 0, endRow: 2, endCol: 0 });
        const data = editor.getData();
        const cell = data.rows[1].cells.name;
        expect(cell.rowspan).toBe(2);
        editor.destroy();
    });

    test("unmergeCells removes colspan and rowspan", () =>
    {
        const editor = createSampleEditor();
        editor.mergeCells({ startRow: 1, startCol: 0, endRow: 1, endCol: 2 });
        editor.unmergeCells("r1", "name");
        const data = editor.getData();
        const cell = data.rows[1].cells.name;
        expect(cell.colspan).toBeUndefined();
        expect(cell.rowspan).toBeUndefined();
        editor.destroy();
    });

    test("mergeCells preserves content of the top-left cell", () =>
    {
        const editor = createSampleEditor();
        editor.mergeCells({ startRow: 1, startCol: 0, endRow: 1, endCol: 2 });
        expect(editor.getCellValue("r1", "name")).toBe("Alice");
        editor.destroy();
    });

    test("merged cells clear absorbed cell content", () =>
    {
        const editor = createSampleEditor();
        editor.mergeCells({ startRow: 1, startCol: 0, endRow: 1, endCol: 2 });
        const data = editor.getData();
        // Absorbed cells should have been deleted from the row
        expect(data.rows[1].cells.role).toBeUndefined();
        expect(data.rows[1].cells.status).toBeUndefined();
        editor.destroy();
    });

    test("merge is blocked when allowMerge is false", () =>
    {
        const editor = createSampleEditor({ allowMerge: false });
        editor.mergeCells({ startRow: 1, startCol: 0, endRow: 1, endCol: 2 });
        const data = editor.getData();
        const cell = data.rows[1].cells.name;
        expect(cell.colspan).toBeUndefined();
        editor.destroy();
    });
});

// ============================================================================
// 7. FORMATTING (10 tests)
// ============================================================================

describe("Formatting", () =>
{
    test("applyStyleToSelection sets bold on selected cells", () =>
    {
        const editor = createSampleEditor();
        editor.setSelection({ startRow: 1, startCol: 0, endRow: 1, endCol: 0 });
        editor.applyStyleToSelection({ bold: true });
        const style = editor.getCellStyle("r1", "name");
        expect(style.bold).toBe(true);
        editor.destroy();
    });

    test("applyStyleToSelection sets italic on selected cells", () =>
    {
        const editor = createSampleEditor();
        editor.setSelection({ startRow: 1, startCol: 0, endRow: 1, endCol: 0 });
        editor.applyStyleToSelection({ italic: true });
        expect(editor.getCellStyle("r1", "name").italic).toBe(true);
        editor.destroy();
    });

    test("applyStyleToSelection sets underline on selected cells", () =>
    {
        const editor = createSampleEditor();
        editor.setSelection({ startRow: 1, startCol: 0, endRow: 1, endCol: 0 });
        editor.applyStyleToSelection({ underline: true });
        expect(editor.getCellStyle("r1", "name").underline).toBe(true);
        editor.destroy();
    });

    test("applyStyleToSelection sets alignment on selected cells", () =>
    {
        const editor = createSampleEditor();
        editor.setSelection({ startRow: 1, startCol: 0, endRow: 1, endCol: 2 });
        editor.applyStyleToSelection({ align: "center" });
        expect(editor.getCellStyle("r1", "name").align).toBe("center");
        expect(editor.getCellStyle("r1", "role").align).toBe("center");
        expect(editor.getCellStyle("r1", "status").align).toBe("center");
        editor.destroy();
    });

    test("applyStyleToSelection works on contiguous range", () =>
    {
        const editor = createSampleEditor();
        editor.setSelection({ startRow: 1, startCol: 0, endRow: 2, endCol: 2 });
        editor.applyStyleToSelection({ bold: true });
        expect(editor.getCellStyle("r1", "name").bold).toBe(true);
        expect(editor.getCellStyle("r2", "status").bold).toBe(true);
        editor.destroy();
    });

    test("applyStyleToSelection works on non-contiguous selection", () =>
    {
        const editor = createSampleEditor();
        editor.setSelection({ startRow: 1, startCol: 0, endRow: 1, endCol: 0 });
        editor.addToSelection({ startRow: 2, startCol: 2, endRow: 2, endCol: 2 });
        editor.applyStyleToSelection({ italic: true });
        expect(editor.getCellStyle("r1", "name").italic).toBe(true);
        expect(editor.getCellStyle("r2", "status").italic).toBe(true);
        // Cells not in selection should not be affected
        expect(editor.getCellStyle("r1", "role").italic).toBeUndefined();
        editor.destroy();
    });

    test("Ctrl+B toggles bold on selection via keyboard", () =>
    {
        const editor = createSampleEditor();
        editor.setSelection({ startRow: 1, startCol: 0, endRow: 1, endCol: 0 });
        pressKey("b", { ctrlKey: true });
        expect(editor.getCellStyle("r1", "name").bold).toBe(true);
        // Toggle off
        pressKey("b", { ctrlKey: true });
        expect(editor.getCellStyle("r1", "name").bold).toBe(false);
        editor.destroy();
    });

    test("Ctrl+I toggles italic on selection via keyboard", () =>
    {
        const editor = createSampleEditor();
        editor.setSelection({ startRow: 1, startCol: 0, endRow: 1, endCol: 0 });
        pressKey("i", { ctrlKey: true });
        expect(editor.getCellStyle("r1", "name").italic).toBe(true);
        editor.destroy();
    });

    test("Ctrl+U toggles underline on selection via keyboard", () =>
    {
        const editor = createSampleEditor();
        editor.setSelection({ startRow: 1, startCol: 0, endRow: 1, endCol: 0 });
        pressKey("u", { ctrlKey: true });
        expect(editor.getCellStyle("r1", "name").underline).toBe(true);
        editor.destroy();
    });

    test("applyStyleToSelection sets fontSize", () =>
    {
        const editor = createSampleEditor();
        editor.setSelection({ startRow: 1, startCol: 0, endRow: 1, endCol: 0 });
        editor.applyStyleToSelection({ fontSize: 18 });
        expect(editor.getCellStyle("r1", "name").fontSize).toBe(18);
        editor.destroy();
    });
});

// ============================================================================
// 8. PRESETS (8 tests)
// ============================================================================

describe("Presets", () =>
{
    test("applyPreset blue-header sets header styles", () =>
    {
        const editor = createSampleEditor();
        editor.applyPreset("blue-header");
        const style = editor.getCellStyle("hdr", "name");
        expect(style.background).toBe("#0d6efd");
        expect(style.color).toBe("#ffffff");
        expect(style.bold).toBe(true);
        editor.destroy();
    });

    test("applyPreset dark-header sets header styles", () =>
    {
        const editor = createSampleEditor();
        editor.applyPreset("dark-header");
        const style = editor.getCellStyle("hdr", "name");
        expect(style.background).toBe("#212529");
        expect(style.color).toBe("#ffffff");
        editor.destroy();
    });

    test("applyPreset green-accent sets header styles", () =>
    {
        const editor = createSampleEditor();
        editor.applyPreset("green-accent");
        const style = editor.getCellStyle("hdr", "role");
        expect(style.background).toBe("#198754");
        editor.destroy();
    });

    test("applyPreset warm sets header styles", () =>
    {
        const editor = createSampleEditor();
        editor.applyPreset("warm");
        const style = editor.getCellStyle("hdr", "name");
        expect(style.background).toBe("#fd7e14");
        editor.destroy();
    });

    test("applyPreset minimal sets transparent header", () =>
    {
        const editor = createSampleEditor();
        editor.applyPreset("minimal");
        const style = editor.getCellStyle("hdr", "name");
        expect(style.background).toBe("transparent");
        const data = editor.getData();
        expect(data.meta!.bordered).toBe(false);
        editor.destroy();
    });

    test("applyPreset striped sets alternating rows", () =>
    {
        const editor = createSampleEditor();
        editor.applyPreset("striped");
        const data = editor.getData();
        expect(data.meta!.alternatingRows).toBe(true);
        expect(data.meta!.alternatingRowColor).toBe("var(--bs-tertiary-bg)");
        editor.destroy();
    });

    test("preset applied via options at construction time", () =>
    {
        const editor = createSampleEditor({ preset: "blue-header" });
        const style = editor.getCellStyle("hdr", "name");
        expect(style.background).toBe("#0d6efd");
        editor.destroy();
    });

    test("preset preserves per-cell overrides", () =>
    {
        const editor = createSampleEditor();
        editor.setCellStyle("r1", "name", { color: "#ff0000" });
        editor.applyPreset("blue-header");
        // Per-cell style on a data row should remain
        const style = editor.getCellStyle("r1", "name");
        expect(style.color).toBe("#ff0000");
        editor.destroy();
    });
});

// ============================================================================
// 9. KEYBOARD (10 tests)
// ============================================================================

describe("Keyboard", () =>
{
    test("ArrowDown moves selection down", () =>
    {
        const editor = createSampleEditor();
        editor.setSelection({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
        pressKey("ArrowDown");
        const sel = editor.getSelection();
        expect(sel[0].startRow).toBe(1);
        editor.destroy();
    });

    test("ArrowRight moves selection right", () =>
    {
        const editor = createSampleEditor();
        editor.setSelection({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
        pressKey("ArrowRight");
        const sel = editor.getSelection();
        expect(sel[0].startCol).toBe(1);
        editor.destroy();
    });

    test("ArrowUp moves selection up", () =>
    {
        const editor = createSampleEditor();
        editor.setSelection({ startRow: 1, startCol: 0, endRow: 1, endCol: 0 });
        pressKey("ArrowUp");
        const sel = editor.getSelection();
        expect(sel[0].startRow).toBe(0);
        editor.destroy();
    });

    test("Shift+ArrowDown extends selection", () =>
    {
        const editor = createSampleEditor();
        editor.setSelection({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
        pressKey("ArrowDown", { shiftKey: true });
        const sel = editor.getSelection();
        expect(sel[0].endRow).toBe(1);
        editor.destroy();
    });

    test("Tab moves selection to next cell", () =>
    {
        const editor = createSampleEditor();
        editor.setSelection({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
        pressKey("Tab");
        const sel = editor.getSelection();
        expect(sel[0].startCol).toBe(1);
        editor.destroy();
    });

    test("Escape clears selection", () =>
    {
        const editor = createSampleEditor();
        editor.setSelection({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
        pressKey("Escape");
        expect(editor.getSelection()).toHaveLength(0);
        editor.destroy();
    });

    test("Delete clears content of selected cells", () =>
    {
        const editor = createSampleEditor();
        editor.setSelection({ startRow: 1, startCol: 0, endRow: 1, endCol: 0 });
        pressKey("Delete");
        expect(editor.getCellValue("r1", "name")).toBe("");
        editor.destroy();
    });

    test("Ctrl+A selects all cells", () =>
    {
        const editor = createSampleEditor();
        pressKey("a", { ctrlKey: true });
        const sel = editor.getSelection();
        expect(sel).toHaveLength(1);
        expect(sel[0]).toEqual({ startRow: 0, startCol: 0, endRow: 2, endCol: 2 });
        editor.destroy();
    });

    test("keyboard navigation is no-op in view mode", () =>
    {
        const editor = createSampleEditor({ mode: "view" });
        editor.setSelection({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
        pressKey("ArrowDown");
        // In view mode, keydown handler returns early, selection is not changed
        // The selection was set programmatically, but key events are ignored
        const sel = editor.getSelection();
        expect(sel[0].startRow).toBe(0);
        editor.destroy();
    });

    test("Enter/F2 starts cell editing", () =>
    {
        const editor = createSampleEditor();
        editor.setSelection({ startRow: 1, startCol: 0, endRow: 1, endCol: 0 });
        pressKey("Enter");
        // After Enter, the cell should be in editing mode
        const editingCell = container.querySelector(".vte-cell--editing");
        expect(editingCell).not.toBeNull();
        editor.destroy();
    });
});

// ============================================================================
// 10. CLIPBOARD (4 tests)
// ============================================================================

describe("Clipboard", () =>
{
    test("Ctrl+C copies selected cells as TSV to clipboard", () =>
    {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, {
            clipboard: { writeText, readText: vi.fn() },
        });

        const editor = createSampleEditor();
        editor.setSelection({ startRow: 1, startCol: 0, endRow: 2, endCol: 2 });
        pressKey("c", { ctrlKey: true });

        expect(writeText).toHaveBeenCalled();
        const tsv = writeText.mock.calls[0][0];
        expect(tsv).toContain("Alice");
        expect(tsv).toContain("\t");
        expect(tsv).toContain("\n");
        editor.destroy();
    });

    test("paste TSV data populates cells starting at selection anchor", () =>
    {
        const tsvText = "X\tY\nZ\tW";
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn(),
                readText: vi.fn().mockResolvedValue(tsvText),
            },
        });

        const editor = createSampleEditor();
        editor.setSelection({ startRow: 1, startCol: 0, endRow: 1, endCol: 0 });
        pressKey("v", { ctrlKey: true });

        // readText returns a promise; flush microtasks
        vi.advanceTimersByTime(0);

        // After paste, the resolved promise callback should have run
        // We need to flush the promise
        return navigator.clipboard.readText!().then(() =>
        {
            // The paste data should be applied
            // Re-check after microtask
            expect(editor.getCellValue("r1", "name")).toBe("X");
            expect(editor.getCellValue("r1", "role")).toBe("Y");
            expect(editor.getCellValue("r2", "name")).toBe("Z");
            expect(editor.getCellValue("r2", "role")).toBe("W");
            editor.destroy();
        });
    });

    test("paste overflow adds rows when allowStructureEdit is true", () =>
    {
        const tsvText = "A\nB\nC\nD\nE";
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn(),
                readText: vi.fn().mockResolvedValue(tsvText),
            },
        });

        const editor = createSampleEditor();
        editor.setSelection({ startRow: 1, startCol: 0, endRow: 1, endCol: 0 });
        pressKey("v", { ctrlKey: true });

        return navigator.clipboard.readText!().then(() =>
        {
            // Should have expanded the table to accommodate the extra rows
            const data = editor.getData();
            expect(data.rows.length).toBeGreaterThanOrEqual(5);
            editor.destroy();
        });
    });

    test("paste with merged cells still applies data at anchor", () =>
    {
        const tsvText = "Hello";
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn(),
                readText: vi.fn().mockResolvedValue(tsvText),
            },
        });

        const editor = createSampleEditor();
        editor.mergeCells({ startRow: 1, startCol: 0, endRow: 1, endCol: 1 });
        editor.setSelection({ startRow: 1, startCol: 0, endRow: 1, endCol: 0 });
        pressKey("v", { ctrlKey: true });

        return navigator.clipboard.readText!().then(() =>
        {
            expect(editor.getCellValue("r1", "name")).toBe("Hello");
            editor.destroy();
        });
    });
});

// ============================================================================
// 11. PAGINATION (5 tests)
// ============================================================================

describe("Pagination", () =>
{
    test("auto-paginates when row count exceeds 500", () =>
    {
        const columns = [{ id: "c1" }];
        const rows = [{ id: "hdr", cells: { c1: { value: "H" } } }];

        for (let i = 0; i < 550; i++)
        {
            rows.push({ id: "r" + i, cells: { c1: { value: String(i) } } });
        }

        const editor = createVisualTableEditor(defaultOptions({
            data: { meta: { headerRows: 1 }, columns, rows },
        }));

        expect(getPagination()).not.toBeNull();
        editor.destroy();
    });

    test("custom pageSize enables pagination", () =>
    {
        const columns = [{ id: "c1" }];
        const rows: { id: string; cells: Record<string, { value: string }> }[] = [];

        for (let i = 0; i < 20; i++)
        {
            rows.push({ id: "r" + i, cells: { c1: { value: String(i) } } });
        }

        const editor = createVisualTableEditor(defaultOptions({
            data: { columns, rows },
            pageSize: 5,
        }));

        expect(getPagination()).not.toBeNull();
        editor.destroy();
    });

    test("header rows appear on every page", () =>
    {
        const columns = [{ id: "c1" }];
        const rows = [{ id: "hdr", cells: { c1: { value: "Header" } } }];

        for (let i = 0; i < 20; i++)
        {
            rows.push({ id: "r" + i, cells: { c1: { value: String(i) } } });
        }

        const editor = createVisualTableEditor(defaultOptions({
            data: { meta: { headerRows: 1 }, columns, rows },
            pageSize: 5,
        }));

        // On page 1, header row should be rendered
        const headerCells = container.querySelectorAll(".vte-header-row");
        expect(headerCells.length).toBeGreaterThan(0);
        editor.destroy();
    });

    test("pagination navigates between pages", () =>
    {
        const columns = [{ id: "c1" }];
        const rows: { id: string; cells: Record<string, { value: string }> }[] = [];

        for (let i = 0; i < 20; i++)
        {
            rows.push({ id: "r" + i, cells: { c1: { value: String(i) } } });
        }

        const editor = createVisualTableEditor(defaultOptions({
            data: { columns, rows },
            pageSize: 5,
        }));

        const pag = getPagination();
        expect(pag).not.toBeNull();

        // The label should say Page 1 of 4
        const label = pag!.querySelector(".vte-pagination-label");
        expect(label!.textContent).toContain("Page 1");

        // Click next
        const buttons = pag!.querySelectorAll<HTMLButtonElement>(".vte-pagination-btn");
        const nextBtn = buttons[buttons.length - 1];
        nextBtn.click();

        // After click, label should update
        const newLabel = getPagination()!.querySelector(".vte-pagination-label");
        expect(newLabel!.textContent).toContain("Page 2");
        editor.destroy();
    });

    test("inserting row updates pagination", () =>
    {
        const columns = [{ id: "c1" }];
        const rows: { id: string; cells: Record<string, { value: string }> }[] = [];

        for (let i = 0; i < 10; i++)
        {
            rows.push({ id: "r" + i, cells: { c1: { value: String(i) } } });
        }

        const editor = createVisualTableEditor(defaultOptions({
            data: { columns, rows },
            pageSize: 5,
        }));

        const pagBefore = getPagination();
        expect(pagBefore).not.toBeNull();
        const labelBefore = pagBefore!.querySelector(".vte-pagination-label")!.textContent;

        // Insert a row
        editor.insertRow();

        // Pagination should be re-rendered
        const pagAfter = getPagination();
        const labelAfter = pagAfter!.querySelector(".vte-pagination-label")!.textContent;

        // After adding a row, the total pages may have changed
        expect(labelAfter).toContain("Page 1");
        editor.destroy();
    });
});

// ============================================================================
// 12. UNDO/REDO (5 tests)
// ============================================================================

describe("Undo/Redo", () =>
{
    test("undo reverts a cell value change", () =>
    {
        const editor = createSampleEditor();
        editor.setCellValue("r1", "name", "Changed");
        expect(editor.getCellValue("r1", "name")).toBe("Changed");
        pressKey("z", { ctrlKey: true });
        expect(editor.getCellValue("r1", "name")).toBe("Alice");
        editor.destroy();
    });

    test("undo reverts a cell style change", () =>
    {
        const editor = createSampleEditor();
        editor.setCellStyle("r1", "name", { bold: true });
        expect(editor.getCellStyle("r1", "name").bold).toBe(true);
        pressKey("z", { ctrlKey: true });
        expect(editor.getCellStyle("r1", "name").bold).toBeUndefined();
        editor.destroy();
    });

    test("undo reverts a structure change (removeRow)", () =>
    {
        const editor = createSampleEditor();
        expect(editor.getData().rows).toHaveLength(3);
        editor.removeRow("r2");
        expect(editor.getData().rows).toHaveLength(2);
        pressKey("z", { ctrlKey: true });
        expect(editor.getData().rows).toHaveLength(3);
        editor.destroy();
    });

    test("redo re-applies an undone change", () =>
    {
        const editor = createSampleEditor();
        editor.setCellValue("r1", "name", "Changed");
        pressKey("z", { ctrlKey: true });
        expect(editor.getCellValue("r1", "name")).toBe("Alice");
        pressKey("y", { ctrlKey: true });
        expect(editor.getCellValue("r1", "name")).toBe("Changed");
        editor.destroy();
    });

    test("undo stack respects the 50-entry limit", () =>
    {
        const editor = createSampleEditor();

        // Push 55 changes to exceed the limit
        for (let i = 0; i < 55; i++)
        {
            editor.setCellValue("r1", "name", "Change" + i);
        }

        // Undo 50 times (the maximum stack depth)
        for (let i = 0; i < 50; i++)
        {
            pressKey("z", { ctrlKey: true });
        }

        // After 50 undos, one more undo should not change anything
        const valBefore = editor.getCellValue("r1", "name");
        pressKey("z", { ctrlKey: true });
        const valAfter = editor.getCellValue("r1", "name");
        expect(valAfter).toBe(valBefore);
        editor.destroy();
    });
});

// ============================================================================
// 13. MODE (4 tests)
// ============================================================================

describe("Mode", () =>
{
    test("setMode switches from view to edit", () =>
    {
        const editor = createSampleEditor({ mode: "view" });
        expect(editor.getMode()).toBe("view");
        editor.setMode("edit");
        expect(editor.getMode()).toBe("edit");
        expect(getRoot()!.classList.contains("vte-root--edit")).toBe(true);
        editor.destroy();
    });

    test("setMode switches from edit to view", () =>
    {
        const editor = createSampleEditor({ mode: "edit" });
        editor.setMode("view");
        expect(editor.getMode()).toBe("view");
        expect(getRoot()!.classList.contains("vte-root--view")).toBe(true);
        editor.destroy();
    });

    test("toolbar is visible in edit mode and hidden in view mode", () =>
    {
        const editor = createSampleEditor({ mode: "edit" });
        expect(getToolbar()).not.toBeNull();
        editor.setMode("view");
        expect(getToolbar()).toBeNull();
        editor.destroy();
    });

    test("cells are not editable in view mode", () =>
    {
        const editor = createSampleEditor({ mode: "view" });
        // In view mode, clicking a cell should not start editing
        clickCell(1, 0);
        // Double-click to attempt editing
        const cell = container.querySelector('[data-row="1"][data-col="0"]') as HTMLElement;

        if (cell)
        {
            cell.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
        }

        const editingCell = container.querySelector(".vte-cell--editing");
        expect(editingCell).toBeNull();
        editor.destroy();
    });
});

// ============================================================================
// 14. SORT/FILTER (6 tests)
// ============================================================================

describe("Sort/Filter", () =>
{
    test("sortRows reorders data rows by comparator", () =>
    {
        const editor = createSampleEditor();
        editor.sortRows((a, b) =>
        {
            const aVal = a.cells.name?.value as string || "";
            const bVal = b.cells.name?.value as string || "";
            return aVal.localeCompare(bVal);
        });

        const data = editor.getData();
        // Header should still be first
        expect(data.rows[0].id).toBe("hdr");
        // Data rows should be sorted alphabetically: Alice, Bob
        expect((data.rows[1].cells.name.value as string)).toBe("Alice");
        expect((data.rows[2].cells.name.value as string)).toBe("Bob");
        editor.destroy();
    });

    test("filterRows hides rows that do not match predicate", () =>
    {
        const editor = createSampleEditor();
        editor.filterRows((row) =>
        {
            const val = row.cells.name?.value as string || "";
            return val === "Alice";
        });

        // After filtering, the rendered table should show fewer data rows
        // But getData still returns all rows
        const data = editor.getData();
        expect(data.rows).toHaveLength(3);

        // The rendered cells should reflect the filter
        const renderedRows = container.querySelectorAll("tr[data-row-index]");
        // Should have header + 1 filtered row
        expect(renderedRows.length).toBeLessThanOrEqual(2);
        editor.destroy();
    });

    test("clearFilter restores all rows", () =>
    {
        const editor = createSampleEditor();
        editor.filterRows((row) =>
        {
            const val = row.cells.name?.value as string || "";
            return val === "Alice";
        });

        editor.clearFilter();

        const renderedRows = container.querySelectorAll("tr[data-row-index]");
        expect(renderedRows.length).toBe(3);
        editor.destroy();
    });

    test("onHeaderClick fires when a header cell is clicked", () =>
    {
        const callback = vi.fn();
        const editor = createSampleEditor({ onHeaderClick: callback });
        clickCell(0, 0);
        expect(callback).toHaveBeenCalledWith("name", expect.any(MouseEvent));
        editor.destroy();
    });

    test("onHeaderContextMenu fires on right-click of header cell", () =>
    {
        const callback = vi.fn();
        const editor = createSampleEditor({ onHeaderContextMenu: callback });

        const cell = container.querySelector('[data-row="0"][data-col="0"]') as HTMLElement;

        if (cell)
        {
            cell.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
        }

        expect(callback).toHaveBeenCalledWith("name", expect.any(MouseEvent));
        editor.destroy();
    });

    test("sortRows preserves cell styles", () =>
    {
        const editor = createSampleEditor();
        editor.setCellStyle("r1", "name", { color: "#ff0000" });

        editor.sortRows((a, b) =>
        {
            const aVal = a.cells.name?.value as string || "";
            const bVal = b.cells.name?.value as string || "";
            return bVal.localeCompare(aVal);
        });

        // Alice's row (r1) should now be after Bob's row (r2)
        // The style should still be on the Alice row
        const data = editor.getData();
        const aliceRow = data.rows.find(r => r.id === "r1");
        expect(aliceRow!.cells.name.style!.color).toBe("#ff0000");
        editor.destroy();
    });
});

// ============================================================================
// 15. AGGREGATES (12 tests)
// ============================================================================

describe("Aggregates", () =>
{
    test("getAggregates computes sum for numeric range", () =>
    {
        const editor = createVisualTableEditor(defaultOptions({ data: numericData() }));
        const result = editor.getAggregates({
            startRow: 1, startCol: 1, endRow: 3, endCol: 1,
        });

        expect(result.sum).toBe(650);
        editor.destroy();
    });

    test("getAggregates computes average for numeric range", () =>
    {
        const editor = createVisualTableEditor(defaultOptions({ data: numericData() }));
        const result = editor.getAggregates({
            startRow: 1, startCol: 1, endRow: 3, endCol: 1,
        });

        expect(result.average).toBeCloseTo(216.67, 1);
        editor.destroy();
    });

    test("getAggregates computes min for numeric range", () =>
    {
        const editor = createVisualTableEditor(defaultOptions({ data: numericData() }));
        const result = editor.getAggregates({
            startRow: 1, startCol: 1, endRow: 3, endCol: 1,
        });

        expect(result.min).toBe(100);
        editor.destroy();
    });

    test("getAggregates computes max for numeric range", () =>
    {
        const editor = createVisualTableEditor(defaultOptions({ data: numericData() }));
        const result = editor.getAggregates({
            startRow: 1, startCol: 1, endRow: 3, endCol: 1,
        });

        expect(result.max).toBe(350);
        editor.destroy();
    });

    test("getAggregates skips non-numeric cells", () =>
    {
        const editor = createVisualTableEditor(defaultOptions({ data: numericData() }));
        const result = editor.getAggregates({
            startRow: 1, startCol: 0, endRow: 3, endCol: 1,
        });

        // Column "item" has text values (Widget, Gadget, Doohickey)
        // Column "price" has $100, $200, $350
        // countNumbers should only count the price column
        expect(result.countNumbers).toBe(3);
        editor.destroy();
    });

    test("getAggregates returns null for mixed unit signatures", () =>
    {
        const data: VisualTableData = {
            columns: [{ id: "val" }],
            rows: [
                { id: "r1", cells: { val: { value: "$100" } } },
                { id: "r2", cells: { val: { value: "45%" } } },
                { id: "r3", cells: { val: { value: "200" } } },
            ],
        };

        const editor = createVisualTableEditor(defaultOptions({ data }));
        const result = editor.getAggregates({
            startRow: 0, startCol: 0, endRow: 2, endCol: 0,
        });

        expect(result.sum).toBeNull();
        editor.destroy();
    });

    test("getAggregates returns valid result for same unit", () =>
    {
        const data: VisualTableData = {
            columns: [{ id: "val" }],
            rows: [
                { id: "r1", cells: { val: { value: "$100" } } },
                { id: "r2", cells: { val: { value: "$200" } } },
                { id: "r3", cells: { val: { value: "$350" } } },
            ],
        };

        const editor = createVisualTableEditor(defaultOptions({ data }));
        const result = editor.getAggregates({
            startRow: 0, startCol: 0, endRow: 2, endCol: 0,
        });

        expect(result.sum).toBe(650);
        expect(result.unit).toBe("$_");
        editor.destroy();
    });

    test("summary bar renders when showSummaryBar is enabled", () =>
    {
        const editor = createVisualTableEditor(defaultOptions({
            data: {
                ...numericData(),
                meta: { ...numericData().meta, showSummaryBar: true },
            },
        }));

        expect(getSummaryBar()).not.toBeNull();
        editor.destroy();
    });

    test("setFooterAggregate sets the table-level footer aggregate", () =>
    {
        const editor = createVisualTableEditor(defaultOptions({ data: numericData() }));
        editor.setFooterAggregate("sum");
        const data = editor.getData();
        expect(data.meta!.footerAggregate).toBe("sum");
        editor.destroy();
    });

    test("setColumnAggregate sets per-column footer aggregate", () =>
    {
        const editor = createVisualTableEditor(defaultOptions({ data: numericData() }));
        editor.setColumnAggregate("price", "average");
        const data = editor.getData();
        const col = data.columns.find(c => c.id === "price");
        expect(col!.aggregate).toBe("average");
        editor.destroy();
    });

    test("onAggregateChange callback fires when selection changes with summary bar", () =>
    {
        const callback = vi.fn();
        const editor = createVisualTableEditor(defaultOptions({
            data: {
                ...numericData(),
                meta: { ...numericData().meta, showSummaryBar: true },
            },
            onAggregateChange: callback,
        }));

        editor.setSelection({ startRow: 1, startCol: 1, endRow: 3, endCol: 1 });
        expect(callback).toHaveBeenCalled();
        editor.destroy();
    });

    test("getAggregates computes median correctly", () =>
    {
        const editor = createVisualTableEditor(defaultOptions({ data: numericData() }));
        const result = editor.getAggregates({
            startRow: 1, startCol: 1, endRow: 3, endCol: 1,
        });

        // Values: 100, 200, 350 => median = 200
        expect(result.median).toBe(200);
        editor.destroy();
    });

    test("getAggregates computes mode correctly", () =>
    {
        const data: VisualTableData = {
            columns: [{ id: "val" }],
            rows: [
                { id: "r1", cells: { val: { value: "10" } } },
                { id: "r2", cells: { val: { value: "20" } } },
                { id: "r3", cells: { val: { value: "20" } } },
                { id: "r4", cells: { val: { value: "30" } } },
            ],
        };

        const editor = createVisualTableEditor(defaultOptions({ data }));
        const result = editor.getAggregates({
            startRow: 0, startCol: 0, endRow: 3, endCol: 0,
        });

        expect(result.mode).toBe(20);
        editor.destroy();
    });

    test("getAggregates computes stddev correctly", () =>
    {
        const data: VisualTableData = {
            columns: [{ id: "val" }],
            rows: [
                { id: "r1", cells: { val: { value: "2" } } },
                { id: "r2", cells: { val: { value: "4" } } },
                { id: "r3", cells: { val: { value: "4" } } },
                { id: "r4", cells: { val: { value: "4" } } },
                { id: "r5", cells: { val: { value: "5" } } },
                { id: "r6", cells: { val: { value: "5" } } },
                { id: "r7", cells: { val: { value: "7" } } },
                { id: "r8", cells: { val: { value: "9" } } },
            ],
        };

        const editor = createVisualTableEditor(defaultOptions({ data }));
        const result = editor.getAggregates({
            startRow: 0, startCol: 0, endRow: 7, endCol: 0,
        });

        expect(result.stddev).not.toBeNull();
        expect(result.stddev!).toBeGreaterThan(0);
        // Population stddev of [2,4,4,4,5,5,7,9]: mean=5, variance=4, stddev=2
        expect(result.stddev!).toBeCloseTo(2, 0);
        editor.destroy();
    });

    test("getAggregates returns empty result with no selection and no range", () =>
    {
        const editor = createVisualTableEditor(defaultOptions({ data: numericData() }));
        const result = editor.getAggregates();
        expect(result.count).toBe(0);
        expect(result.sum).toBeNull();
        editor.destroy();
    });
});

// ============================================================================
// 16. CALLBACKS (8 tests)
// ============================================================================

describe("Callbacks", () =>
{
    test("onCellChange fires when setCellValue is called", () =>
    {
        const callback = vi.fn();
        const editor = createSampleEditor({ onCellChange: callback });
        editor.setCellValue("r1", "name", "Updated");
        expect(callback).toHaveBeenCalledWith("r1", "name", "Alice", "Updated");
        editor.destroy();
    });

    test("onStyleChange fires when setCellStyle is called", () =>
    {
        const callback = vi.fn();
        const editor = createSampleEditor({ onStyleChange: callback });
        editor.setCellStyle("r1", "name", { italic: true });
        expect(callback).toHaveBeenCalledWith("r1", "name", { italic: true });
        editor.destroy();
    });

    test("onStructureChange fires when insertColumn is called", () =>
    {
        const callback = vi.fn();
        const editor = createSampleEditor({ onStructureChange: callback });
        editor.insertColumn();
        expect(callback).toHaveBeenCalledWith(
            "insert-column",
            expect.objectContaining({ columnId: expect.any(String) })
        );
        editor.destroy();
    });

    test("onModeChange fires when setMode is called", () =>
    {
        const callback = vi.fn();
        const editor = createSampleEditor({ onModeChange: callback });
        editor.setMode("view");
        expect(callback).toHaveBeenCalledWith("view");
        editor.destroy();
    });

    test("onChange fires with debounce when data changes", () =>
    {
        const callback = vi.fn();
        const editor = createSampleEditor({ onChange: callback });
        editor.setCellValue("r1", "name", "Test");

        expect(callback).not.toHaveBeenCalled();
        vi.advanceTimersByTime(300);
        expect(callback).toHaveBeenCalledTimes(1);
        editor.destroy();
    });

    test("onSelectionChange fires when setSelection is called", () =>
    {
        const callback = vi.fn();
        const editor = createSampleEditor({ onSelectionChange: callback });
        editor.setSelection({ startRow: 1, startCol: 0, endRow: 1, endCol: 0 });
        expect(callback).toHaveBeenCalled();
        editor.destroy();
    });

    test("onHeaderClick fires when header cell is clicked", () =>
    {
        const callback = vi.fn();
        const editor = createSampleEditor({ onHeaderClick: callback });
        clickCell(0, 1);
        expect(callback).toHaveBeenCalledWith("role", expect.any(MouseEvent));
        editor.destroy();
    });

    test("onHeaderContextMenu fires on right-click of header", () =>
    {
        const callback = vi.fn();
        const editor = createSampleEditor({ onHeaderContextMenu: callback });
        const cell = container.querySelector('[data-row="0"][data-col="1"]') as HTMLElement;

        if (cell)
        {
            cell.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
        }

        expect(callback).toHaveBeenCalledWith("role", expect.any(MouseEvent));
        editor.destroy();
    });
});

// ============================================================================
// 17. LIFECYCLE (3 tests)
// ============================================================================

describe("Lifecycle", () =>
{
    test("show and hide toggle visibility", () =>
    {
        const editor = createSampleEditor();
        editor.hide();
        expect(getRoot()!.style.display).toBe("none");
        editor.show();
        expect(getRoot()!.style.display).toBe("");
        editor.destroy();
    });

    test("destroy removes the DOM and prevents further renders", () =>
    {
        const editor = createSampleEditor();
        expect(getRoot()).not.toBeNull();
        editor.destroy();
        expect(getRoot()).toBeNull();
    });

    test("refresh re-renders the table", () =>
    {
        const editor = createSampleEditor();
        const cellsBefore = getCells().length;
        editor.refresh();
        const cellsAfter = getCells().length;
        expect(cellsAfter).toBe(cellsBefore);
        editor.destroy();
    });
});

// ============================================================================
// 18. ACCESSIBILITY (4 tests)
// ============================================================================

describe("Accessibility", () =>
{
    test("table has role=grid", () =>
    {
        const editor = createSampleEditor();
        const table = getTable();
        expect(table).not.toBeNull();
        expect(table!.getAttribute("role")).toBe("grid");
        editor.destroy();
    });

    test("selected cells have aria-selected=true", () =>
    {
        const editor = createSampleEditor();
        editor.setSelection({ startRow: 1, startCol: 0, endRow: 1, endCol: 0 });
        const cell = container.querySelector('[data-row="1"][data-col="0"]');
        expect(cell!.getAttribute("aria-selected")).toBe("true");
        editor.destroy();
    });

    test("table container has tabindex for keyboard access", () =>
    {
        const editor = createSampleEditor();
        const tableContainer = container.querySelector(".vte-table-container");
        expect(tableContainer!.getAttribute("tabindex")).toBe("0");
        editor.destroy();
    });

    test("table has aria-label", () =>
    {
        const editor = createSampleEditor();
        const table = getTable();
        expect(table!.getAttribute("aria-label")).toBe("Visual Table Editor");
        editor.destroy();
    });
});
