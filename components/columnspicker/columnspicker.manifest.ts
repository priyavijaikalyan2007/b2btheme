/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: a953e7c4-d93a-40f7-ba87-3e036aadf6b2
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Columns Picker / CapabilityManifest
 * PURPOSE: Declares what Columns Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Columns Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker columnspicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const COLUMNSPICKER_MANIFEST: CapabilityManifest =
{
    name: "columnspicker",
    factory: "createColumnsPicker",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Columns Picker",
    icon: "bi-layout-three-columns",
    category: "input",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 6039, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 200, h: 40 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
