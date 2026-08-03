/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: f4b94698-a936-4749-bc92-748e32880c6b
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Graph Legend / CapabilityManifest
 * PURPOSE: Declares what Graph Legend can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Graph Legend]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker graphlegend-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const GRAPHLEGEND_MANIFEST: CapabilityManifest =
{
    name: "graphlegend",
    factory: "createGraphLegend",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Graph Legend",
    icon: "bi-list-columns",
    category: "other",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 6905, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 240, h: 300 },
    defaultOptions: { nodeTypes: [], edgeTypes: [] },

    conformance: "display",
    priority: 50,
};
