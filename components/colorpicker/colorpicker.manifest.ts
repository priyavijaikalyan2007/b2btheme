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
 * Declared at `field` conformance: the handle exposes getValue and setValue
 * (ADR-134), so the canvas can read and set its value, and the conformance
 * suite verifies that contract. `field` is also the level the suite computes
 * this component requires (ADR-219). Promoted from `display` on 2026-10-25,
 * when the suite showed it already met that level.
 */
export const COLORPICKER_MANIFEST: CapabilityManifest =
{
    name: "colorpicker",
    factory: "createColorPicker",
    label: "Color Picker",
    icon: "bi-palette",
    category: "input",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user pick any colour, with a palette, a colour field and hex or RGB entry.",
        avoidWhen: "For a drawing tool's stroke and fill use ToolColorPicker; for a gradient use GradientPicker.",
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
            onInput: "Fires continuously while dragging; the two-way value carries the committed colour.",
            triggerElement: "Takes a DOM element to anchor to, which JSON cannot carry.",
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 23042, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 280, h: 320 },
    defaultOptions: {},

    conformance: "field",
    priority: 50,
};
