/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 07055204-6aee-4e75-bb3f-39a1004a8e22
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Angle Picker / CapabilityManifest
 * PURPOSE: Declares what Angle Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Angle Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker anglepicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `field` conformance: the handle exposes getValue and setValue
 * (ADR-134), so the canvas can read and set its value, and the conformance
 * suite verifies that contract. `field` is also the level the suite computes
 * this component requires (ADR-219). Promoted from `display` on 2026-10-25,
 * when the suite showed it already met that level.
 */
export const ANGLEPICKER_MANIFEST: CapabilityManifest =
{
    name: "anglepicker",
    factory: "createAnglePicker",
    label: "Angle Picker",
    icon: "bi-arrow-clockwise",
    category: "input",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user set an angle in degrees with a dial, such as a rotation or a gradient direction.",
        avoidWhen: "For a plain number on a scale use RangeSlider; for a typed number use TextField.",
    },

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B3).
    protocol: {
        hostOnly: {
            onOpen: "Fires when the popup opens; that is view state, not information for an agent.",
            onClose: "Fires when the popup closes; that is view state, not information for an agent.",
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 13251, mountCost: "light", holdsResources: false },

    defaultSize: { w: 160, h: 160 },
    defaultOptions: {},

    conformance: "field",
    priority: 50,
};
