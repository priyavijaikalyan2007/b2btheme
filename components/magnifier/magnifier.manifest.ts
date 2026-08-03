/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: f9950747-bce7-4ad4-b924-dceb803d1725
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Magnifier / CapabilityManifest
 * PURPOSE: Declares what Magnifier can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Magnifier]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker magnifier-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const MAGNIFIER_MANIFEST: CapabilityManifest =
{
    name: "magnifier",
    factory: "createMagnifier",
    label: "Magnifier",
    icon: "bi-zoom-in",
    category: "navigation",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 5150, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 150, h: 150 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
