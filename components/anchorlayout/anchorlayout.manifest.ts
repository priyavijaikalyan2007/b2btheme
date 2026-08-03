/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: b2ab034d-7086-44fe-8e7e-a668bdedafa9
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Anchor Layout / CapabilityManifest
 * PURPOSE: Declares what Anchor Layout can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Anchor Layout]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker anchorlayout-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const ANCHORLAYOUT_MANIFEST: CapabilityManifest =
{
    name: "anchorlayout",
    factory: "createAnchorLayout",
    factoryStyle: "options-first",
    label: "Anchor Layout",
    icon: "bi-pin-angle",
    category: "layout",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 6733, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 600, h: 400 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
