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
    selectNode(nodeId: string): void;
}

export const CONFORMANCE_GLUE =
{
    options: {
        roots: [
            {
                id: "fixture-root",
                label: "Root",
                children: [{ id: "fixture-child", label: "Child" }],
            },
        ],
    },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        if (channel === "selection")
        {
            (handle as unknown as TreeLike).selectNode("fixture-child");
            return true;
        }

        // "activate" fires from a double-click or Enter on a focused row and
        // has no programmatic entry point. Declining records a warning.
        return false;
    },
};
