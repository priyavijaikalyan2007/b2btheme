/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 0b5ad312-c5b6-46eb-a256-870078cd19a2
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Doc Viewer / CapabilityManifest
 * PURPOSE: Declares what Doc Viewer can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Doc Viewer]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker docviewer-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const DOCVIEWER_MANIFEST: CapabilityManifest =
{
    name: "docviewer",
    factory: "createDocViewer",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Doc Viewer",
    icon: "bi-file-text",
    category: "content",

    affords: [
        {
            shape: "document",
            intents: ["browse", "inspect"],
            cardinality: { min: 1, max: 500 },
            minViewport: { w: 320, h: 240 },
        },
    ],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 12200, mountCost: "light", holdsResources: false },

    defaultSize: { w: 600, h: 450 },
    defaultOptions: { pages: [] },

    conformance: "display",
    priority: 50,
};
