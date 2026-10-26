/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 76a492ab-116b-4d0a-8522-0357658827da
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Search Box / CapabilityManifest
 * PURPOSE: Declares what Search Box can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Search Box]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker searchbox-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `field` conformance: the handle exposes getValue and setValue
 * (ADR-134), so the canvas can read and set its value, and the conformance
 * suite verifies that contract. `field` is also the level the suite computes
 * this component requires (ADR-219). Promoted from `display` on 2026-10-25,
 * when the suite showed it already met that level.
 */
export const SEARCHBOX_MANIFEST: CapabilityManifest =
{
    name: "searchbox",
    factory: "createSearchBox",
    label: "Search Box",
    icon: "bi-search",
    category: "input",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    regions: ["searchbox:suggestions"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 10291, mountCost: "light", holdsResources: false },

    defaultSize: { w: 250, h: 34 },
    defaultOptions: {},

    conformance: "field",
    priority: 50,
};
