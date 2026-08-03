/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 9f57756a-9253-4f0a-954f-660403409569
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Grid Layout / CapabilityManifest
 * PURPOSE: Declares what Grid Layout can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Grid Layout]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker gridlayout-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const GRIDLAYOUT_MANIFEST: CapabilityManifest =
{
    name: "gridlayout",
    factory: "createGridLayout",
    factoryStyle: "options-first",
    label: "Grid Layout",
    icon: "bi-grid-3x3",
    category: "layout",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 6464, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 500, h: 400 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
