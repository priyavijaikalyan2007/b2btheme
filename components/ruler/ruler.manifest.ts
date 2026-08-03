/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 7ef93661-c5e9-4df1-bb79-cb2032277f85
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Ruler / CapabilityManifest
 * PURPOSE: Declares what Ruler can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Ruler]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker ruler-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const RULER_MANIFEST: CapabilityManifest =
{
    name: "ruler",
    factory: "createRuler",
    label: "Ruler",
    icon: "bi-rulers",
    category: "navigation",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 7645, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 400, h: 24 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
