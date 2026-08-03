/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: dea129d8-121f-4aab-8ddd-7a0a18849270
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Duration Picker / CapabilityManifest
 * PURPOSE: Declares what Duration Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Duration Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker durationpicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const DURATIONPICKER_MANIFEST: CapabilityManifest =
{
    name: "durationpicker",
    factory: "createDurationPicker",
    label: "Duration Picker",
    icon: "bi-hourglass-split",
    category: "input",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 21177, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 250, h: 40 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
