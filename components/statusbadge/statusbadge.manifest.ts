/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 969b761c-4e82-46a5-b3c9-cc82b6d85c96
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Status Badge / CapabilityManifest
 * PURPOSE: Declares what Status Badge can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Status Badge]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker statusbadge-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const STATUSBADGE_MANIFEST: CapabilityManifest =
{
    name: "statusbadge",
    factory: "createStatusBadge",
    label: "Status Badge",
    icon: "bi-circle-fill",
    category: "other",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 5051, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 80, h: 24 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
