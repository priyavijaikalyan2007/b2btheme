/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 3810029e-2f20-4629-a927-cdc565a70430
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Gauge / CapabilityManifest
 * PURPOSE: Declares what Gauge can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Gauge]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker gauge-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `field` conformance: the handle exposes getValue and setValue
 * (ADR-134), so the canvas can read and set its value, and the conformance
 * suite verifies that contract. `field` is also the level the suite computes
 * this component requires (ADR-219). Promoted from `display` on 2026-10-25,
 * when the suite showed it already met that level.
 */
export const GAUGE_MANIFEST: CapabilityManifest =
{
    name: "gauge",
    factory: "createGauge",
    factoryStyle: "options-first",
    label: "Gauge",
    icon: "bi-speedometer2",
    category: "other",

    affords: [
        {
            shape: "scalar",
            intents: ["monitor"],
            cardinality: { min: 1, max: 1 },
            minViewport: { w: 140, h: 140 },
        },
    ],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 12616, mountCost: "light", holdsResources: false },

    defaultSize: { w: 200, h: 200 },
    defaultOptions: {},

    conformance: "field",
    priority: 50,
};
