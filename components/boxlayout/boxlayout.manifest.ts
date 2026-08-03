/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 5219fa9d-dce6-4852-afff-5d3b7721095e
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Box Layout / CapabilityManifest
 * PURPOSE: Declares what Box Layout can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Box Layout]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker boxlayout-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const BOXLAYOUT_MANIFEST: CapabilityManifest =
{
    name: "boxlayout",
    factory: "createBoxLayout",
    factoryStyle: "options-first",
    label: "Box Layout",
    icon: "bi-distribute-horizontal",
    category: "layout",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 5576, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 400, h: 200 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
