/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: bd279eb6-5de8-49a7-b147-12b2f864130d
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Presence Indicator / CapabilityManifest
 * PURPOSE: Declares what Presence Indicator can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Presence Indicator]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker presenceindicator-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const PRESENCEINDICATOR_MANIFEST: CapabilityManifest =
{
    name: "presenceindicator",
    factory: "createPresenceIndicator",
    label: "Presence Indicator",
    icon: "bi-people-fill",
    category: "social",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 7208, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 120, h: 32 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
