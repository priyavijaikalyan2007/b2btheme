/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: SprintPicker / ConformanceGlue
 * 📜 PURPOSE: The mount fixture the conformance gate needs. ERR-2 made
 *    anchorDate required, and the gate had been mounting
 *    this component with no options at all. The fixture lives here rather
 *    than in the manifest, because manifest defaultOptions ship to
 *    consumers and this is placeholder content.
 * 🔗 RELATES: [[SprintPicker]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker sprintpicker-conformance-glue

export const CONFORMANCE_GLUE =
{
    options: { anchorDate: "2026-01-05" },
};
