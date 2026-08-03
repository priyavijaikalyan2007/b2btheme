/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: c03c3cb3-ecf9-4cf9-bd81-084e644715ac
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Spine Map / CapabilityManifest
 * PURPOSE: Declares what Spine Map can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Spine Map]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker spinemap-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const SPINEMAP_MANIFEST: CapabilityManifest =
{
    name: "spinemap",
    factory: "createSpineMap",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Spine Map",
    icon: "bi-bezier2",
    category: "data",

    affords: [
        {
            shape: "graph",
            intents: ["relate", "browse"],
            cardinality: { min: 2, max: 5000 },
            minViewport: { w: 360, h: 260 },
        },
    ],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 56035, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 500, h: 350 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
