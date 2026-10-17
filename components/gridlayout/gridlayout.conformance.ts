/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: GridLayout / ConformanceGlue
 * 📜 PURPOSE: The mount fixture the conformance gate needs. ERR-2 made
 *    columns required, and the gate had been mounting
 *    this component with no options at all. The fixture lives here rather
 *    than in the manifest, because manifest defaultOptions ship to
 *    consumers and this is placeholder content.
 * 🔗 RELATES: [[GridLayout]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker gridlayout-conformance-glue

export const CONFORMANCE_GLUE =
{
    options: { columns: "auto" },
};
