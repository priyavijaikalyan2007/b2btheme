/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: a662ff2b-20d5-4641-94a2-9678ac96a01a
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Breadcrumb / CapabilityManifest
 * PURPOSE: Declares what Breadcrumb can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Breadcrumb]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker breadcrumb-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B4): it emits
 * "itemClick" and "actionClick" through an additive on(). It has no view
 * state, so stateKeys is empty (ADR-229).
 */
export const BREADCRUMB_MANIFEST: CapabilityManifest =
{
    name: "breadcrumb",
    factory: "createBreadcrumb",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Breadcrumb",
    icon: "bi-chevron-right",
    category: "other",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show where the user is in a hierarchy as a trail of links, with actions on the last segment; the "
            + "agent hears each click.",
        avoidWhen: "For switching between sibling views use Tabs; for browsing a whole hierarchy use TreeView.",
    },

    affords: [],
    emits: [
        { name: "itemClick", payload: "record", multi: false, legacyOption: "onItemClick" },
        { name: "actionClick", payload: "record", multi: false, legacyOption: "onActionClick" },
    ],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B4).
    protocol: {
        hostOnly: {
            "items[].data": "An arbitrary payload for host callbacks; it has no schema an agent could follow.",
        },
        schemas: {
            // The link rule (readiness step 2 B4, ADR-229): items[].href is left out, so an agent's link is rejected.
            // Over A2UI, listen for itemClick and answer with openUrl.
            items: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        label: { type: "string", description: "Display label." },
                        icon: { type: "string", description: "Bootstrap Icons class (e.g. \"bi-house-fill\")." },
                    },
                    required: ["label"],
                    additionalProperties: false,
                },
            },
        },
    },

    regions: ["breadcrumb:nav-dropdown"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 8431, mountCost: "light", holdsResources: false },

    defaultSize: { w: 400, h: 28 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
