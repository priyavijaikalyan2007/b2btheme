/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: b93e80c5-56e8-478e-baaf-91e5a67ce630
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Gradient Picker / CapabilityManifest
 * PURPOSE: Declares what Gradient Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Gradient Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker gradientpicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const GRADIENTPICKER_MANIFEST: CapabilityManifest =
{
    name: "gradientpicker",
    factory: "createGradientPicker",
    label: "Gradient Picker",
    icon: "bi-palette2",
    category: "input",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 29936, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 300, h: 340 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
