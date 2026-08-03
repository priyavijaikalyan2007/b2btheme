/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: fa38cf32-da8e-43c0-99c5-0e9803599d41
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Line Width Picker / CapabilityManifest
 * PURPOSE: Declares what Line Width Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Line Width Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker linewidthpicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const LINEWIDTHPICKER_MANIFEST: CapabilityManifest =
{
    name: "linewidthpicker",
    factory: "createLineWidthPicker",
    label: "Line Width Picker",
    icon: "bi-border-width",
    category: "input",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 8580, mountCost: "light", holdsResources: false },

    defaultSize: { w: 200, h: 34 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
