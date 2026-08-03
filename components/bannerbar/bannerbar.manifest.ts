/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 5cb08db4-ebb3-4b4e-930e-570dbfd3dae8
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Banner Bar / CapabilityManifest
 * PURPOSE: Declares what Banner Bar can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Banner Bar]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker bannerbar-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const BANNERBAR_MANIFEST: CapabilityManifest =
{
    name: "bannerbar",
    factory: "createBannerBar",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Banner Bar",
    icon: "bi-megaphone",
    category: "other",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 7149, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 600, h: 48 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
