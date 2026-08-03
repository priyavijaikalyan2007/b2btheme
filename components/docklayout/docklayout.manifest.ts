/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 536f580d-7ec1-447a-ab29-2b3d11afd16c
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Dock Layout / CapabilityManifest
 * PURPOSE: Declares what Dock Layout can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Dock Layout]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker docklayout-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const DOCKLAYOUT_MANIFEST: CapabilityManifest =
{
    name: "docklayout",
    factory: "createDockLayout",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Dock Layout",
    icon: "bi-grid-1x2",
    category: "layout",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 10061, mountCost: "light", holdsResources: false },

    defaultSize: { w: 600, h: 400 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
