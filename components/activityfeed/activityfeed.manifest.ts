/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 5a2e2e21-23e4-486f-b4a0-ca1ac40618df
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Activity Feed / CapabilityManifest
 * PURPOSE: Declares what Activity Feed can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Activity Feed]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker activityfeed-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const ACTIVITYFEED_MANIFEST: CapabilityManifest =
{
    name: "activityfeed",
    factory: "createActivityFeed",
    factoryStyle: "options-first",
    label: "Activity Feed",
    icon: "bi-rss",
    category: "social",

    affords: [
        {
            shape: "collection",
            intents: ["browse", "monitor"],
            cardinality: { min: 1, max: 2000 },
            minViewport: { w: 280, h: 200 },
        },
    ],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 12159, mountCost: "light", holdsResources: false },

    defaultSize: { w: 350, h: 400 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
