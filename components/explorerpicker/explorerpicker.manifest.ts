/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 10e2af24-757e-4178-8d21-13a0fc1d4a4b
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Explorerpicker / CapabilityManifest
 * PURPOSE: Declares what Explorerpicker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Explorerpicker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker explorerpicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const EXPLORERPICKER_MANIFEST: CapabilityManifest =
{
    name: "explorerpicker",
    factory: "createExplorerPicker",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Explorerpicker",
    icon: "bi-square",
    category: "misc",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 36839, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 320, h: 240 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
