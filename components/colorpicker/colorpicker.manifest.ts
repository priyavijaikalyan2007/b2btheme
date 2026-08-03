/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: a9f2ba92-9338-4474-bd25-c1926cfd4a32
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Color Picker / CapabilityManifest
 * PURPOSE: Declares what Color Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Color Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker colorpicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const COLORPICKER_MANIFEST: CapabilityManifest =
{
    name: "colorpicker",
    factory: "createColorPicker",
    label: "Color Picker",
    icon: "bi-palette",
    category: "input",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 23042, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 280, h: 320 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
