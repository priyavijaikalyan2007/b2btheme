/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: TreeGrid / ConformanceGlue
 * 📜 PURPOSE: The mount fixture the conformance gate needs. ERR-2 made
 *    label, nodes and columns required, and the gate had been mounting
 *    this component with no options at all. The fixture lives here rather
 *    than in the manifest, because manifest defaultOptions ship to
 *    consumers and this is placeholder content.
 * 🔗 RELATES: [[TreeGrid]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker treegrid-conformance-glue

export const CONFORMANCE_GLUE =
{
    options: {
        label: "Fixture grid",
        nodes: [],
        columns: [{ key: "name", label: "Name" }],
    },
};
