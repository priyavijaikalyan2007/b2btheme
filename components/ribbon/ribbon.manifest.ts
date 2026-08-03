/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 9ef02c67-69f7-48df-9213-26bc46425c3e
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Ribbon / CapabilityManifest
 * PURPOSE: Declares what Ribbon can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Ribbon]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker ribbon-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const RIBBON_MANIFEST: CapabilityManifest =
{
    name: "ribbon",
    factory: "createRibbon",
    factoryStyle: "options-first",
    label: "Ribbon",
    icon: "bi-layout-text-window",
    category: "navigation",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 41931, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 600, h: 120 },
    defaultOptions: { tabs: [] },

    conformance: "display",
    priority: 50,
};
