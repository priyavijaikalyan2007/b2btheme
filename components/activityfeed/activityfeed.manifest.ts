/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 5a2e2e21-23e4-486f-b4a0-ca1ac40618df
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Activity Feed / CapabilityManifest
 * PURPOSE: Declares what Activity Feed can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Activity Feed]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker activityfeed-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B6): clicks on an event,
 * its actor or its target emit through an additive on(). Nothing to restore
 * (ADR-229).
 */
export const ACTIVITYFEED_MANIFEST: CapabilityManifest =
{
    name: "activityfeed",
    factory: "createActivityFeed",
    factoryStyle: "options-first",
    label: "Activity Feed",
    icon: "bi-rss",
    category: "social",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show a timeline of who did what and when, grouped by day; the agent hears clicks on an event, its "
            + "actor or its target.",
        avoidWhen: "For a log of technical messages use LogConsole; for alerts the user must act on use "
            + "NotificationCenter.",
    },

    affords: [
        {
            shape: "collection",
            intents: ["browse", "monitor"],
            cardinality: { min: 1, max: 2000 },
            minViewport: { w: 280, h: 200 },
        },
    ],
    emits: [
        { name: "eventClick", payload: "record", multi: false, legacyOption: "onEventClick" },
        { name: "actorClick", payload: "record", multi: false, legacyOption: "onActorClick" },
        { name: "targetClick", payload: "record", multi: false, legacyOption: "onTargetClick" },
    ],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B6).
    protocol: {
        hostOnly: {
            "events[].metadata": "An arbitrary payload for host code; it has no schema an agent could follow.",
            onLoadMore: "Takes no parameter, and a provider needs one to carry its request; over A2UI the agent "
                + "supplies the events.",
        },
    },

    regions: ["activityfeed:feed"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 12159, mountCost: "light", holdsResources: false },

    defaultSize: { w: 350, h: 400 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
