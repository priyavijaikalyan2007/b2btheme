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
 * Declared at `field` conformance: the handle exposes getValue and setValue
 * (ADR-134), so the canvas can read and set its value, and the conformance
 * suite verifies that contract. `field` is also the level the suite computes
 * this component requires (ADR-219). Promoted from `display` on 2026-10-25,
 * when the suite showed it already met that level.
 */
export const LINETYPEPICKER_MANIFEST: CapabilityManifest =
{
    name: "linetypepicker",
    factory: "createLineTypePicker",
    label: "Line Type Picker",
    icon: "bi-dash-lg",
    category: "input",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user choose a line's dash pattern, such as solid, dashed or dotted, with a preview.",
        avoidWhen: "For a line's thickness use LineWidthPicker; for its routing shape use LineShapePicker.",
    },

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B1).
    protocol: {
        change: { valueFrom: "value" },
        hostOnly: {
            onOpen: "Fires when the dropdown opens; that is view state, not information for an agent.",
            onClose: "Fires when the dropdown closes; that is view state, not information for an agent.",
        },
    },

    regions: ["linetypepicker:list"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 9573, mountCost: "light", holdsResources: false },

    defaultSize: { w: 200, h: 34 },
    defaultOptions: {},

    conformance: "field",
    priority: 50,
};
