/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 64ce6274-4f25-4d7b-b8ce-949e81a50bbe
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Layer Layout / CapabilityManifest
 * PURPOSE: Declares what Layer Layout can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Layer Layout]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker layerlayout-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const LAYERLAYOUT_MANIFEST: CapabilityManifest =
{
    name: "layerlayout",
    factory: "createLayerLayout",
    factoryStyle: "options-first",
    label: "Layer Layout",
    icon: "bi-layers",
    category: "layout",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 5390, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 600, h: 400 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
