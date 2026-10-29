/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 3303c27b-324a-4c53-a05f-ba1cf86df9f4
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Symbol Picker / CapabilityManifest
 * PURPOSE: Declares what Symbol Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Symbol Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker symbolpicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B3): it emits "insert"
 * through an additive on() when the user inserts a symbol, and restores its
 * selection through getState()/setState() (stateKeys: value).
 */
export const SYMBOLPICKER_MANIFEST: CapabilityManifest =
{
    name: "symbolpicker",
    factory: "createSymbolPicker",
    label: "Symbol Picker",
    icon: "bi-emoji-smile",
    category: "input",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user browse and insert special characters or icons from categorised grids.",
        avoidWhen: "To show one fixed icon use Icon; to pick from a short list of options use ChoicePicker.",
    },

    affords: [],
    emits: [
        { name: "insert", payload: "record", multi: false, legacyOption: "onInsert" },
    ],
    accepts: [],
    actions: [],
    stateKeys: ["value"],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B3).
    protocol: {
        hostOnly: {
            onOpen: "Fires when the popup opens; that is view state, not information for an agent.",
            onClose: "Fires when the popup closes; that is view state, not information for an agent.",
            onSelect: "Fires when a symbol is highlighted; the two-way value carries the choice.",
            triggerElement: "Takes a DOM element to anchor to, which JSON cannot carry.",
        },
    },

    regions: ["symbolpicker:panel", "symbolpicker:grid-wrap"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 46327, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 320, h: 300 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
