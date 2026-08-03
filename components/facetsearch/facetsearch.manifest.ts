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
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
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

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 21028, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 350, h: 34 },
    defaultOptions: { facets: [] },

    conformance: "display",
    priority: 50,
};
