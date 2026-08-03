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
}

/**
 * DataGrid's `(options, containerId)` argument order is declared in its
 * manifest as `factoryStyle`, so no invoke override is needed here.
 *
 * `trigger` returns false for channels that cannot be driven programmatically,
 * which records a visible warning instead of a false pass.
 */
export const CONFORMANCE_GLUE =
{
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

        // "activate" fires from a row double-click and has no programmatic
        // entry point. Declining is recorded as a warning by the gate.
        return false;
    },
};
