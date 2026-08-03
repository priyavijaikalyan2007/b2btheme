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
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
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

    conformance: "display",
    priority: 50,
};
