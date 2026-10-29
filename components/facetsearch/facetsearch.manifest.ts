/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 14a98094-e6c5-4e92-8931-d09dc77569eb
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Facet Search / CapabilityManifest
 * PURPOSE: Declares what Facet Search can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Facet Search]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker facetsearch-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B6): submitting emits
 * "search" with the parsed query through an additive on(), and the query
 * string is two-way.
 */
export const FACETSEARCH_MANIFEST: CapabilityManifest =
{
    name: "facetsearch",
    factory: "createFacetSearch",
    label: "Facet Search",
    icon: "bi-funnel",
    category: "other",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user search with free text plus key:value filters picked from known facets; the agent hears "
            + "each search.",
        avoidWhen: "For plain text search use SearchBox; for picking from a fixed list use ChoicePicker.",
    },

    affords: [],
    emits: [
        { name: "search", payload: "record", multi: false, legacyOption: "onSearch" },
    ],
    accepts: [],
    actions: [],
    stateKeys: ["value"],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B6).
    protocol: {
        hostOnly: {
            "facets[].loadValues": "A function that loads a facet's values; over A2UI each facet lists its values.",
            onFacetAdd: "Fires per added filter; the two-way value already carries the query.",
            onFacetRemove: "Fires per removed filter; the two-way value already carries the query.",
            onClear: "Fires when the user clears the query; the two-way value already carries it.",
        },
    },

    regions: ["facetsearch:dropdown"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 21028, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 350, h: 34 },
    defaultOptions: { facets: [] },

    conformance: "surface",
    priority: 50,
};
