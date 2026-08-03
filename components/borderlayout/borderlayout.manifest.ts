/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: fef69c85-a69b-4f86-a94e-36f98c011979
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Border Layout / CapabilityManifest
 * PURPOSE: Declares what Border Layout can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Border Layout]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker borderlayout-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const BORDERLAYOUT_MANIFEST: CapabilityManifest =
{
    name: "borderlayout",
    factory: "createBorderLayout",
    factoryStyle: "options-first",
    label: "Border Layout",
    icon: "bi-border-outer",
    category: "layout",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 6030, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 600, h: 400 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
