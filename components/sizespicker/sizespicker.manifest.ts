/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 2a3b0d69-9a94-422b-b70d-baba7855f73b
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Sizes Picker / CapabilityManifest
 * PURPOSE: Declares what Sizes Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Sizes Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker sizespicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B1): it emits "custom"
 * when the user chooses the "Custom…" link, through an additive on(), and
 * restores its selection through getState()/setState() (stateKeys: value).
 * Its value is the selected preset's name.
 */
export const SIZESPICKER_MANIFEST: CapabilityManifest =
{
    name: "sizespicker",
    factory: "createSizesPicker",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Sizes Picker",
    icon: "bi-rulers",
    category: "input",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user choose a paper or page size, such as Letter, Legal or A4, from named presets.",
        avoidWhen: "For page margins use MarginsPicker; for text columns use ColumnsPicker.",
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

    regions: ["sizespicker:list"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 8994, mountCost: "light", holdsResources: false },

    defaultSize: { w: 200, h: 40 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
