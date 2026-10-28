/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 94bbdc9a-b1bc-4c2f-aaa3-85b098ff9cd3
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Slider / CapabilityManifest
 * PURPOSE: Declares what Slider can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Slider]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker slider-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B3): onChange cannot map
 * to the numeric value, so over A2UI it is a "change" event through an
 * additive on(), and value is one-way. It restores value and range.
 */
export const SLIDER_MANIFEST: CapabilityManifest =
{
    name: "slider",
    factory: "createSlider",
    label: "Slider",
    icon: "bi-sliders",
    category: "input",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user choose a number, or a low-high range, by dragging along a scale with steps.",
        avoidWhen: "For an angle use AnglePicker; for a typed number use TextField.",
    },

    affords: [],
    emits: [
        { name: "change", payload: "scalar", multi: false, legacyOption: "onChange" },
    ],
    accepts: [],
    actions: [],
    stateKeys: ["value", "range"],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B3).
    protocol: {
        // A2UI's basic catalog already has a Slider; this one also does ranges.
        name: "RangeSlider",
        // onChange passes number | { low, high }, which cannot map to the numeric value: value is one-way.
        change: "event",
        hostOnly: {
            formatValue: "A formatting function; the default number format applies over A2UI.",
            onSlideStart: "Fires when dragging starts; that is view state, not information for an agent.",
            onSlideEnd: "Fires when dragging ends; the change event already carries the value.",
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 9674, mountCost: "light", holdsResources: false },

    defaultSize: { w: 200, h: 40 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
