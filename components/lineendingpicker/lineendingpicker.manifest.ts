/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 0d63adae-113a-4e10-b522-06df5ad7d49b
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Line Ending Picker / CapabilityManifest
 * PURPOSE: Declares what Line Ending Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Line Ending Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker lineendingpicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `field` conformance: the handle exposes getValue and setValue
 * (ADR-134), so the canvas can read and set its value, and the conformance
 * suite verifies that contract. `field` is also the level the suite computes
 * this component requires (ADR-219). Promoted from `display` on 2026-10-25,
 * when the suite showed it already met that level.
 */
export const LINEENDINGPICKER_MANIFEST: CapabilityManifest =
{
    name: "lineendingpicker",
    factory: "createLineEndingPicker",
    label: "Line Ending Picker",
    icon: "bi-arrow-right",
    category: "input",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    regions: ["lineendingpicker:list"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 14339, mountCost: "light", holdsResources: false },

    defaultSize: { w: 200, h: 34 },
    defaultOptions: {},

    conformance: "field",
    priority: 50,
};
