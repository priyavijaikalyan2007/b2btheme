/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 4b9e0066-7728-4e71-87c8-f65e064e450b
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Tree View / CapabilityManifest
 * PURPOSE: Declares what Tree View can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Tree View]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker treeview-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const TREEVIEW_MANIFEST: CapabilityManifest =
{
    name: "treeview",
    factory: "createTreeView",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Tree View",
    icon: "bi-list-nested",
    category: "data",

    affords: [
        {
            shape: "hierarchy",
            intents: ["browse", "navigate", "inspect"],
            cardinality: { min: 1, max: 20_000 },
            minViewport: { w: 220, h: 200 },
        },
    ],

    emits: [
        { name: "selection", payload: "record", multi: true, legacyOption: "onSelectionChange" },
        { name: "activate", payload: "record", multi: false, legacyOption: "onActivate" },
    ],

    accepts: [
        { name: "roots", payload: "hierarchy", required: true },
    ],

    actions: [],
    stateKeys: ["expanded", "selection"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 46857, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 280, h: 350 },
    defaultOptions: { roots: [] },

    conformance: "surface",
    priority: 70,
};
