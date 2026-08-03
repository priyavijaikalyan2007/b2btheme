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
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
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

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 9032, mountCost: "light", holdsResources: false },

    defaultSize: { w: 320, h: 240 },
    defaultOptions: { kind: "bar", ariaLabel: "Chart", categories: [], series: [] },

    conformance: "display",
    priority: 50,
};
