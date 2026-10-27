/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 34a64b61-109d-4bd9-b51c-eb24d92dc2b3
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Tool Color Picker / CapabilityManifest
 * PURPOSE: Declares what Tool Color Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Tool Color Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker toolcolorpicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `field` conformance: the handle exposes getValue and setValue
 * (ADR-134), so the canvas can read and set its value, and the conformance
 * suite verifies that contract. `field` is also the level the suite computes
 * this component requires (ADR-219). Promoted from `display` on 2026-10-25,
 * when the suite showed it already met that level.
 */
export const TOOLCOLORPICKER_MANIFEST: CapabilityManifest =
{
    name: "toolcolorpicker",
    factory: "createToolColorPicker",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Tool Color Picker",
    icon: "bi-palette-fill",
    category: "input",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 7823, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 250, h: 40 },
    defaultOptions: {},

    conformance: "field",
    priority: 50,

    protocol: {
        // onChange passes the whole ToolColor; value is its hex (#39, ADR-222).
        change: { valueFrom: "hex" },
    },
};
