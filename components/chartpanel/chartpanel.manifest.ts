/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: ed8b9a4f-01f1-4eb1-aae9-15641261c32d
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Chartpanel / CapabilityManifest
 * PURPOSE: Declares what Chartpanel can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Chartpanel]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker chartpanel-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance (readiness step 2 B6): it draws with
 * Chart.js, which the adapter loads first (ADR-230), and emits nothing.
 */
export const CHARTPANEL_MANIFEST: CapabilityManifest =
{
    name: "chartpanel",
    factory: "createChartPanel",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Chartpanel",
    icon: "bi-square",
    category: "misc",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show numbers as a bar, line, area or sparkline chart across categories, with a legend and axes.",
        avoidWhen: "For one value against a target use Gauge; for one number with a trend use MetricCard.",
    },

    affords: [
        {
            shape: "timeseries",
            intents: ["monitor", "compare", "summarize"],
            cardinality: { min: 2, max: 5000 },
            minViewport: { w: 320, h: 200 },
        },
    ],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B6).
    protocol: {
        hostOnly: {
            "yAxis.format": "A formatting function; the default number format applies over A2UI.",
            id: "Every A2UI component already has an id of its own, so this option cannot be set separately.",
        },
        // Chart.js draws the chart; without it the panel shows an error (ADR-230).
        dependencies: { libraries: ["chart.js"] },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 9032, mountCost: "light", holdsResources: false },

    defaultSize: { w: 320, h: 240 },
    defaultOptions: { kind: "bar", ariaLabel: "Chart", categories: [], series: [] },

    conformance: "display",
    priority: 50,
};
