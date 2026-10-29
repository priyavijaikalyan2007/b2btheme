/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: e64bc80e-8251-45e1-ad42-2b29fefeb2d7
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Timezone Picker / CapabilityManifest
 * PURPOSE: Declares what Timezone Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Timezone Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker timezonepicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `field` conformance: the handle exposes getValue and setValue
 * (ADR-134), so the canvas can read and set its value, and the conformance
 * suite verifies that contract. `field` is also the level the suite computes
 * this component requires (ADR-219). Promoted from `display` on 2026-10-25,
 * when the suite showed it already met that level.
 */
export const TIMEZONEPICKER_MANIFEST: CapabilityManifest =
{
    name: "timezonepicker",
    factory: "createTimezonePicker",
    label: "Timezone Picker",
    icon: "bi-globe",
    category: "input",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user pick an IANA timezone from a searchable list that shows each zone's offset.",
        avoidWhen: "For a time of day with its own timezone selector use TimePicker.",
    },

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B2).
    protocol: {
        hostOnly: {
            onSelect: "Fires when the user commits a pick; the two-way value already carries it to the agent.",
            onOpen: "Fires when the dropdown opens; that is view state, not information for an agent.",
            onClose: "Fires when the dropdown closes; that is view state, not information for an agent.",
        },
    },

    regions: ["timezonepicker:list"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 14353, mountCost: "light", holdsResources: false },

    defaultSize: { w: 250, h: 40 },
    defaultOptions: {},

    conformance: "field",
    priority: 50,
};
