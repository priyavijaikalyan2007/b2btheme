/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 76a492ab-116b-4d0a-8522-0357658827da
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Search Box / CapabilityManifest
 * PURPOSE: Declares what Search Box can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Search Box]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker searchbox-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B3): it emits "search"
 * (debounced) and "submit" through an additive on(), and restores its query
 * through getState()/setState() (stateKeys: value).
 */
export const SEARCHBOX_MANIFEST: CapabilityManifest =
{
    name: "searchbox",
    factory: "createSearchBox",
    label: "Search Box",
    icon: "bi-search",
    category: "input",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Give the user a search field with suggestions; the agent hears each query and each submit.",
        avoidWhen: "To pick people use PeoplePicker; to type or pick from a list use EditableComboBox.",
    },

    affords: [],
    emits: [
        { name: "search", payload: "scalar", multi: false, legacyOption: "onSearch" },
        { name: "submit", payload: "scalar", multi: false, legacyOption: "onSubmit" },
    ],
    accepts: [],
    actions: [],
    stateKeys: ["value"],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B3).
    protocol: {
        hostOnly: {
            suggestions: "Its function arm loads suggestions in host code; only the static list crosses the protocol.",
        },
    },

    regions: ["searchbox:suggestions"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 10291, mountCost: "light", holdsResources: false },

    defaultSize: { w: 250, h: 34 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
