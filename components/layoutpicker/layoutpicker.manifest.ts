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
 * Declared at `field` conformance: the handle exposes getValue and setValue
 * (ADR-134), so the canvas can read and set its value, and the conformance
 * suite verifies that contract. `field` is also the level the suite computes
 * this component requires (ADR-219). Promoted from `display` on 2026-10-25,
 * when the suite showed it already met that level.
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

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user choose an automatic layout algorithm for a graph or diagram, shown as thumbnails.",
        avoidWhen: "For choices that are not layout algorithms use ChoicePicker.",
    },

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B1).
    protocol: {
        change: { valueFrom: "id" },
        hostOnly: {
            "customAlgorithms[].thumbnail": "A function that draws into an SVG element; JSON cannot carry it, so custom thumbnails stay host-only.",
        },
    },

    regions: ["layoutpicker:panel"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 15166, mountCost: "light", holdsResources: false },

    defaultSize: { w: 200, h: 40 },
    defaultOptions: {},

    conformance: "field",
    priority: 50,
};
