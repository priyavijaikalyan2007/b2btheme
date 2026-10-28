/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: a953e7c4-d93a-40f7-ba87-3e036aadf6b2
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Columns Picker / CapabilityManifest
 * PURPOSE: Declares what Columns Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Columns Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker columnspicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B1): it emits "custom"
 * when the user chooses the "Custom…" link, through an additive on(), and
 * restores its selection through getState()/setState() (stateKeys: value).
 * Its value is the selected preset's name.
 */
export const COLUMNSPICKER_MANIFEST: CapabilityManifest =
{
    name: "columnspicker",
    factory: "createColumnsPicker",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Columns Picker",
    icon: "bi-layout-three-columns",
    category: "input",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user choose how many text columns a page or section uses, from presets that preview it.",
        avoidWhen: "For page margins use MarginsPicker; for paper size use SizesPicker.",
    },

    affords: [],
    emits: [
        // "Custom…" asks for a value the presets lack; the agent can answer with its own inputs (B1-1).
        { name: "custom", payload: "scalar", multi: false, legacyOption: "onCustom" },
    ],
    accepts: [],
    actions: [],
    // The selection is the state a canvas restores (B1-2).
    stateKeys: ["value"],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B1).
    protocol: {
        change: { valueFrom: "name" },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 6039, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 200, h: 40 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
