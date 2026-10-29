/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DataGrid / ConformanceGlue
 * 📜 PURPOSE: Tells the fleet conformance gate how to invoke DataGrid and how
 *    to drive each of its declared channels.
 * 🔗 RELATES: [[DataGrid]], [[Conformance]]
 * ⚡ FLOW: [fleet gate] -> [CONFORMANCE_GLUE] -> [runConformance()]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker datagrid-conformance-glue

/** Minimal view of the handle, limited to what the triggers below need. */
interface GridLike
{
    selectRow(rowId: string): void;
    sort(columnId: string): void;
    setPageSize(size: number): void;
    getElement(): HTMLElement;
}

/** Two rows and an editable column, so a cell edit and a row double-click have targets. */
const FIXTURE = {
    columns: [
        { id: "id", label: "ID" },
        { id: "name", label: "Name", editable: true },
    ],
    rows: [
        { id: "r1", data: { id: "r1", name: "One" } },
        { id: "r2", data: { id: "r2", name: "Two" } },
    ],
};

/**
 * DataGrid's `(options, containerId)` argument order is declared in its
 * manifest as `factoryStyle`, so no invoke override is needed here.
 *
 * `trigger` returns false for channels that cannot be driven programmatically,
 * which records a visible warning instead of a false pass.
 */
export const CONFORMANCE_GLUE =
{
    // Mount fixture. Deliberately NOT in the manifest's defaultOptions, which
    // is shipped to consumers and must not carry placeholder content.
    options: FIXTURE,

    // What an agent sets for a grid the user can edit (readiness step 2 B6).
    eventProps: FIXTURE,

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const grid = handle as unknown as GridLike;

        if (channel === "selection")
        {
            grid.selectRow("r1");
            return true;
        }

        if (channel === "sort")
        {
            grid.sort("name");
            return true;
        }

        if (channel === "page")
        {
            grid.setPageSize(1);
            return true;
        }

        const root = grid.getElement();

        if (channel === "activate")
        {
            const row = root.querySelector<HTMLElement>(".datagrid-row");
            row?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
            return row !== null;
        }

        if (channel !== "cellEdit") { return false; }

        // A double-click on the editable cell opens its editor; leaving it commits (readiness step 2 B6).
        root.querySelector<HTMLElement>('.datagrid-cell[data-col-id="name"]')
            ?.dispatchEvent(new MouseEvent("dblclick"));
        const editor = root.querySelector<HTMLInputElement>(".datagrid-editor");

        if (!editor) { return false; }

        editor.value = "Edited";
        editor.dispatchEvent(new Event("blur"));

        return true;
    },
};
