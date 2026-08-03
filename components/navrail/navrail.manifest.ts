/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 9adbb068-d6bd-4c79-a5c7-0c2d34c010c5
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Navrail / CapabilityManifest
 * PURPOSE: Declares what Navrail can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Navrail]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker navrail-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const NAVRAIL_MANIFEST: CapabilityManifest =
{
    name: "navrail",
    factory: "createNavRail",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Navrail",
    icon: "bi-square",
    category: "misc",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 17726, mountCost: "light", holdsResources: false },

    defaultSize: { w: 320, h: 240 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
