/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 666c2b91-c6d2-4fe7-b977-fd1d532fe78b
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Graph Canvas / CapabilityManifest
 * PURPOSE: Declares what Graph Canvas can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Graph Canvas]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker graphcanvas-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const GRAPHCANVAS_MANIFEST: CapabilityManifest =
{
    name: "graphcanvas",
    factory: "createGraphCanvas",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Graph Canvas",
    icon: "bi-share",
    category: "data",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 33075, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 500, h: 400 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
