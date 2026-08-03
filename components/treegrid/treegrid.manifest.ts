/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 958ae449-8941-4cdc-81ec-ab20d33cb6a6
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Tree Grid / CapabilityManifest
 * PURPOSE: Declares what Tree Grid can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Tree Grid]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker treegrid-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const TREEGRID_MANIFEST: CapabilityManifest =
{
    name: "treegrid",
    factory: "createTreeGrid",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Tree Grid",
    icon: "bi-diagram-3",
    category: "data",

    affords: [
        {
            shape: "hierarchy",
            intents: ["browse", "compare"],
            cardinality: { min: 2, max: 50000 },
            minViewport: { w: 320, h: 200 },
        },
    ],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 48200, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 350, h: 300 },
    defaultOptions: { columns: [], rows: [], nodes: [] },

    conformance: "display",
    priority: 50,
};
