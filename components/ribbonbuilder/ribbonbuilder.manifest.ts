/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 827e2b25-2265-48e2-bdf4-168f2e0213b4
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Ribbon Builder / CapabilityManifest
 * PURPOSE: Declares what Ribbon Builder can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Ribbon Builder]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker ribbonbuilder-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const RIBBONBUILDER_MANIFEST: CapabilityManifest =
{
    name: "ribbonbuilder",
    factory: "createRibbonBuilder",
    factoryStyle: "options-first",
    label: "Ribbon Builder",
    icon: "bi-tools",
    category: "navigation",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 44126, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 600, h: 400 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
