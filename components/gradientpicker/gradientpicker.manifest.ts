/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: b93e80c5-56e8-478e-baaf-91e5a67ce630
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Gradient Picker / CapabilityManifest
 * PURPOSE: Declares what Gradient Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Gradient Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker gradientpicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `field` conformance: the handle exposes getValue and setValue
 * (ADR-134), so the canvas can read and set its value, and the conformance
 * suite verifies that contract. `field` is also the level the suite computes
 * this component requires (ADR-219). Promoted from `display` on 2026-10-25,
 * when the suite showed it already met that level.
 */
export const GRADIENTPICKER_MANIFEST: CapabilityManifest =
{
    name: "gradientpicker",
    factory: "createGradientPicker",
    label: "Gradient Picker",
    icon: "bi-palette2",
    category: "input",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user design a linear or radial colour gradient with stops, an angle and presets.",
        avoidWhen: "For a single solid colour use ColorPicker.",
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
            onInput: "Fires continuously while dragging; the two-way value carries the committed gradient.",
            onClear: "Clearing also fires onChange with the reset gradient, so the two-way value carries it.",
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 29936, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 300, h: 340 },
    defaultOptions: {},

    conformance: "field",
    priority: 50,
};
