/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: ChartPanel / ConformanceGlue
 * PURPOSE: Supplies the minimum options this component needs to MOUNT during
 *    the conformance run.
 *
 *    These are test fixtures and deliberately do NOT live in the manifest's
 *    defaultOptions: that field is shipped to consumers via
 *    capability-manifest.json and is what the canvas passes when a host
 *    supplies nothing. A fixture there would put placeholder content in front
 *    of real users.
 * RELATES: [[ChartPanel]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker chartpanel-conformance-glue

export const CONFORMANCE_GLUE =
{
    options: { kind: "bar", ariaLabel: "Conformance fixture chart", categories: ["a"], series: [{ id: "s", label: "S", data: [1] }] },
};
