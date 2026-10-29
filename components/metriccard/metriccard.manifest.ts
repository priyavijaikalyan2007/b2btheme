/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: caf67199-8038-47ed-ace3-712b733f3d68
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Metriccard / CapabilityManifest
 * PURPOSE: Declares what Metriccard can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Metriccard]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker metriccard-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B4): with `clickable`,
 * the card emits "click" with its label through an additive on(). It has no
 * view state, so stateKeys is empty (ADR-229).
 */
export const METRICCARD_MANIFEST: CapabilityManifest =
{
    name: "metriccard",
    factory: "createMetricCard",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Metriccard",
    icon: "bi-square",
    category: "misc",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show one key number with its label, an optional trend and secondary text, as a dashboard tile.",
        avoidWhen: "For a value against a maximum or target use Gauge; for a short status word use StatusBadge.",
    },

    affords: [
        {
            shape: "scalar",
            intents: ["monitor", "summarize"],
            cardinality: { min: 1, max: 1 },
            minViewport: { w: 160, h: 100 },
        },
    ],
    emits: [
        { name: "click", payload: "scalar", multi: false, legacyOption: "onClick" },
    ],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B4).
    protocol: {
        hostOnly: {
            id: "Every A2UI component already has an id of its own, so this option cannot be set separately.",
            // The link rule (readiness step 2 B4, ADR-229).
            href: "A link the user follows from the host's page; an agent must not choose it. Over A2UI, listen for "
                + "the click event and answer with openUrl.",
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 7019, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 320, h: 240 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
