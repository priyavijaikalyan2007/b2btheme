/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: e4333706-d296-45ed-be94-c6107304f316
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Sprint Picker / CapabilityManifest
 * PURPOSE: Declares what Sprint Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Sprint Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker sprintpicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `field` conformance: the handle exposes getValue and setValue
 * (ADR-134), so the canvas can read and set its value, and the conformance
 * suite verifies that contract. `field` is also the level the suite computes
 * this component requires (ADR-219). Promoted from `display` on 2026-10-25,
 * when the suite showed it already met that level.
 */
export const SPRINTPICKER_MANIFEST: CapabilityManifest =
{
    name: "sprintpicker",
    factory: "createSprintPicker",
    label: "Sprint Picker",
    icon: "bi-kanban",
    category: "input",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user pick an agile sprint from a list computed from a start date and a sprint length.",
        avoidWhen: "For a fiscal month or quarter use PeriodPicker; for a single calendar date use DatePicker.",
    },

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B2).
    protocol: {
        // Cleared is an absent path: clearing deletes the bound value (readiness spec §3.4).
        change: { cleared: null },
        hostOnly: {
            onSelect: "Fires when the user commits a pick; the two-way value already carries it to the agent.",
            onOpen: "Fires when the dropdown opens; that is view state, not information for an agent.",
            onClose: "Fires when the dropdown closes; that is view state, not information for an agent.",
            sprintNaming: "Its function arm names sprints in host code; only the data arms cross the protocol.",
        },
    },

    regions: ["sprintpicker:list"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 17662, mountCost: "light", holdsResources: false },

    defaultSize: { w: 250, h: 40 },
    defaultOptions: {},

    conformance: "field",
    priority: 50,
};
