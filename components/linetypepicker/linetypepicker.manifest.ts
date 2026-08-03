/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: da4874c5-be39-4d06-b725-ca6b9a56465b
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Line Type Picker / CapabilityManifest
 * PURPOSE: Declares what Line Type Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Line Type Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker linetypepicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const LINETYPEPICKER_MANIFEST: CapabilityManifest =
{
    name: "linetypepicker",
    factory: "createLineTypePicker",
    label: "Line Type Picker",
    icon: "bi-dash-lg",
    category: "input",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 9573, mountCost: "light", holdsResources: false },

    defaultSize: { w: 200, h: 34 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
