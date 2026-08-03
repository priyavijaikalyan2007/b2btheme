/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 0ea2f8c8-70b8-4f9e-aea5-5347db4a80b9
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Flow Layout / CapabilityManifest
 * PURPOSE: Declares what Flow Layout can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Flow Layout]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker flowlayout-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const FLOWLAYOUT_MANIFEST: CapabilityManifest =
{
    name: "flowlayout",
    factory: "createFlowLayout",
    factoryStyle: "options-first",
    label: "Flow Layout",
    icon: "bi-text-wrap",
    category: "layout",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 5826, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 500, h: 300 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
