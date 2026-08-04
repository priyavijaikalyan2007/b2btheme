/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ⚓ COMPONENT: SplitLayout / ConformanceGlue
 * 📜 PURPOSE: Mount fixture. A split layout with fewer than two panes renders
 *    nothing by design, so the shipped defaultOptions (an empty pane list)
 *    cannot exercise it. Two panes live here rather than in the manifest
 *    because defaultOptions is shipped data.
 * 🔗 RELATES: [[SplitLayout]], [[Conformance]]
 */

// @semantic-marker splitlayout-conformance-glue

export const CONFORMANCE_GLUE =
{
    options: {
        orientation: "horizontal",
        panes: [
            { id: "fixture-a", size: 50 },
            { id: "fixture-b", size: 50 },
        ],
    },
};
