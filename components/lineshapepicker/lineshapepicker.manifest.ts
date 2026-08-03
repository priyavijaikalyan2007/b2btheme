/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 2a27efd9-da7e-45a0-b948-751d92ea8196
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Line Shape Picker / CapabilityManifest
 * PURPOSE: Declares what Line Shape Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Line Shape Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker lineshapepicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const LINESHAPEPICKER_MANIFEST: CapabilityManifest =
{
    name: "lineshapepicker",
    factory: "createLineShapePicker",
    label: "Line Shape Picker",
    icon: "bi-bezier",
    category: "input",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 10135, mountCost: "light", holdsResources: false },

    defaultSize: { w: 200, h: 34 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
