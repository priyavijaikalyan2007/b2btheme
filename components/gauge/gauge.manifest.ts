/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 3810029e-2f20-4629-a927-cdc565a70430
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Gauge / CapabilityManifest
 * PURPOSE: Declares what Gauge can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Gauge]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker gauge-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `field` conformance: the handle exposes getValue and setValue
 * (ADR-134). Over agent protocols value is one-way (readiness step 2 B4):
 * onChange fires inside setValue, so it would only echo the writer's value.
 */
export const GAUGE_MANIFEST: CapabilityManifest =
{
    name: "gauge",
    factory: "createGauge",
    factoryStyle: "options-first",
    label: "Gauge",
    icon: "bi-speedometer2",
    category: "other",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show a value against a maximum, a limit or a deadline as a ring, bar or tile gauge with coloured "
            + "thresholds.",
        avoidWhen: "For a number with a trend and no scale use MetricCard; for a value the user drags use RangeSlider.",
    },

    affords: [
        {
            shape: "scalar",
            intents: ["monitor"],
            cardinality: { min: 1, max: 1 },
            minViewport: { w: 140, h: 140 },
        },
    ],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B4).
    protocol: {
        // onChange fires inside setValue, not on a user edit: value is one-way.
        change: "event",
        hostOnly: {
            onChange: "Fires inside setValue, so it echoes the value the agent or host just wrote.",
            onOverLimit: "Follows from the value and limit the agent set; it adds nothing the agent does not know.",
            onOverdue: "Follows from the deadline the agent set; it adds nothing the agent does not know.",
            formatValue: "A formatting function; the default number format applies over A2UI.",
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 12616, mountCost: "light", holdsResources: false },

    defaultSize: { w: 200, h: 200 },
    defaultOptions: {},

    conformance: "field",
    priority: 50,
};
