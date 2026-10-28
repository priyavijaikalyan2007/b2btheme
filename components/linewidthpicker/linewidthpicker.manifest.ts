/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: fa38cf32-da8e-43c0-99c5-0e9803599d41
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Line Width Picker / CapabilityManifest
 * PURPOSE: Declares what Line Width Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Line Width Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker linewidthpicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `field` conformance: the handle exposes getValue and setValue
 * (ADR-134), so the canvas can read and set its value, and the conformance
 * suite verifies that contract. `field` is also the level the suite computes
 * this component requires (ADR-219). Promoted from `display` on 2026-10-25,
 * when the suite showed it already met that level.
 */
export const LINEWIDTHPICKER_MANIFEST: CapabilityManifest =
{
    name: "linewidthpicker",
    factory: "createLineWidthPicker",
    label: "Line Width Picker",
    icon: "bi-border-width",
    category: "input",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user choose a line or border thickness from a list that previews each width.",
        avoidWhen: "For a line's dash pattern use LineTypePicker; for an arbitrary number use Slider.",
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

    regions: ["linewidthpicker:list"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 8580, mountCost: "light", holdsResources: false },

    defaultSize: { w: 200, h: 34 },
    defaultOptions: {},

    conformance: "field",
    priority: 50,
};
