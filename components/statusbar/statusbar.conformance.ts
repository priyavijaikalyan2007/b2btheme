/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ⚓ COMPONENT: StatusBar / ConformanceGlue
 * 📜 PURPOSE: Mount fixture. regions is required and has no production
 *    default; contained keeps the fixture bar off the viewport's bottom edge.
 *    They live here rather than in the manifest because defaultOptions is
 *    shipped data.
 * 🔗 RELATES: [[StatusBar]], [[Conformance]]
 */

// @semantic-marker statusbar-conformance-glue

export const CONFORMANCE_GLUE =
{
    options: { regions: [{ id: "fixture", label: "Fixture", value: "1" }], contained: true },
};
