/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: ab2bff53-0791-46ab-bfc1-a7b3ef66b1ac
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Layout Picker / CapabilityManifest
 * PURPOSE: Declares what Layout Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Layout Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker layoutpicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const LAYOUTPICKER_MANIFEST: CapabilityManifest =
{
    name: "layoutpicker",
    factory: "createLayoutPicker",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Layout Picker",
    icon: "bi-diagram-3",
    category: "input",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 15166, mountCost: "light", holdsResources: false },

    defaultSize: { w: 200, h: 40 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
