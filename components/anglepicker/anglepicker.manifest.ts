/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 07055204-6aee-4e75-bb3f-39a1004a8e22
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Angle Picker / CapabilityManifest
 * PURPOSE: Declares what Angle Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Angle Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker anglepicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const ANGLEPICKER_MANIFEST: CapabilityManifest =
{
    name: "anglepicker",
    factory: "createAnglePicker",
    label: "Angle Picker",
    icon: "bi-arrow-clockwise",
    category: "input",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 13251, mountCost: "light", holdsResources: false },

    defaultSize: { w: 160, h: 160 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
