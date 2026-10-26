/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 33d607e6-0a2c-4470-9bca-abb552fc8486
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Margins Picker / CapabilityManifest
 * PURPOSE: Declares what Margins Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Margins Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker marginspicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `field` conformance: the handle exposes getValue and setValue
 * (ADR-134), so the canvas can read and set its value, and the conformance
 * suite verifies that contract. `field` is also the level the suite computes
 * this component requires (ADR-219). Promoted from `display` on 2026-10-25,
 * when the suite showed it already met that level.
 */
export const MARGINSPICKER_MANIFEST: CapabilityManifest =
{
    name: "marginspicker",
    factory: "createMarginsPicker",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Margins Picker",
    icon: "bi-border-outer",
    category: "input",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    regions: ["marginspicker:list"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 8704, mountCost: "light", holdsResources: false },

    defaultSize: { w: 200, h: 40 },
    defaultOptions: {},

    conformance: "field",
    priority: 50,
};
