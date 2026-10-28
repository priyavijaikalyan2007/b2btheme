/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 33d607e6-0a2c-4470-9bca-abb552fc8486
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Margins Picker / CapabilityManifest
 * PURPOSE: Declares what Margins Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Margins Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker marginspicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B1): it emits "custom"
 * when the user chooses the "Custom…" link, through an additive on(), and
 * restores its selection through getState()/setState() (stateKeys: value).
 * Its value is the selected preset's name.
 */
export const MARGINSPICKER_MANIFEST: CapabilityManifest =
{
    name: "marginspicker",
    factory: "createMarginsPicker",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Margins Picker",
    icon: "bi-border-outer",
    category: "input",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user choose page margins from named presets such as Normal, Narrow and Wide.",
        avoidWhen: "For paper size use SizesPicker; for line and paragraph spacing use SpacingPicker.",
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

    regions: ["marginspicker:list"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 8704, mountCost: "light", holdsResources: false },

    defaultSize: { w: 200, h: 40 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
