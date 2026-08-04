/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 7bc88a1e-30f8-4238-acd4-3c5b66bcf091
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Pill / CapabilityManifest
 * PURPOSE: Declares what Pill can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Pill]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker pill-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const PILL_MANIFEST: CapabilityManifest =
{
    name: "pill",
    factory: "createPill",
    mountMethod: "getElement",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Pill",
    icon: "bi-capsule",
    category: "social",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 4484, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 100, h: 24 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
