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
 * Declared at `field` conformance: the handle exposes getValue and setValue
 * (ADR-134), so the canvas can read and set its value, and the conformance
 * suite verifies that contract. `field` is also the level the suite computes
 * this component requires (ADR-219). Promoted from `display` on 2026-10-25,
 * when the suite showed it already met that level.
 */
export const FACETSEARCH_MANIFEST: CapabilityManifest =
{
    name: "facetsearch",
    factory: "createFacetSearch",
    label: "Facet Search",
    icon: "bi-funnel",
    category: "other",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    regions: ["facetsearch:dropdown"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 21028, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 350, h: 34 },
    defaultOptions: { facets: [] },

    conformance: "field",
    priority: 50,
};
