/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: cd86db53-6407-48c6-a8ff-5749d5c03405
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Reasoning Accordion / CapabilityManifest
 * PURPOSE: Declares what Reasoning Accordion can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Reasoning Accordion]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker reasoningaccordion-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance (readiness step 2 B4): a step click only
 * toggles that step's expansion, which is view state, so nothing is emitted.
 */
export const REASONINGACCORDION_MANIFEST: CapabilityManifest =
{
    name: "reasoningaccordion",
    factory: "createReasoningAccordion",
    label: "Reasoning Accordion",
    icon: "bi-list-stars",
    category: "ai",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show an agent’s reasoning as collapsible steps with status, timing and confidence, updated as it "
            + "thinks.",
        avoidWhen: "For a plain list of items use List; for sequential tasks the user works through use Stepper.",
    },

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B4).
    protocol: {
        hostOnly: {
            id: "Every A2UI component already has an id of its own, so this option cannot be set separately.",
            onStepClick: "A step click toggles its expansion; that is view state, not information for an agent.",
            onExpandChange: "Fires as a step expands or collapses; that is view state, not information for an agent.",
            "steps[].metadata": "An arbitrary payload for host code; it has no schema an agent could follow.",
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 13412, mountCost: "light", holdsResources: false },

    defaultSize: { w: 400, h: 300 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
