/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 73cd9e18-aeac-4109-bad1-867496be246d
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Flex Grid Layout / CapabilityManifest
 * PURPOSE: Declares what Flex Grid Layout can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Flex Grid Layout]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker flexgridlayout-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const FLEXGRIDLAYOUT_MANIFEST: CapabilityManifest =
{
    name: "flexgridlayout",
    factory: "createFlexGridLayout",
    factoryStyle: "options-first",
    label: "Flex Grid Layout",
    icon: "bi-grid",
    category: "layout",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 5870, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 600, h: 400 },
    defaultOptions: { areas: [], columns: [], rows: [] },

    conformance: "display",
    priority: 50,
};
