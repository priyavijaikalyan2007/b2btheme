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
 * Declared at `field` conformance: the handle exposes getValue and setValue
 * (ADR-134), so the canvas can read and set its value, and the conformance
 * suite verifies that contract. `field` is also the level the suite computes
 * this component requires (ADR-219). Promoted from `display` on 2026-10-25,
 * when the suite showed it already met that level.
 */
export const LINESHAPEPICKER_MANIFEST: CapabilityManifest =
{
    name: "lineshapepicker",
    factory: "createLineShapePicker",
    label: "Line Shape Picker",
    icon: "bi-bezier",
    category: "input",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user choose the routing shape of a connector in a diagram, such as straight or curved.",
        avoidWhen: "For a line's dash pattern use LineTypePicker; for its end markers use LineEndingPicker.",
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

    regions: ["lineshapepicker:list"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 10135, mountCost: "light", holdsResources: false },

    defaultSize: { w: 200, h: 34 },
    defaultOptions: {},

    conformance: "field",
    priority: 50,
};
