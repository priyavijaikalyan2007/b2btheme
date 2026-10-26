/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 2ac37150-93fb-4b14-b3b7-c63f3edd6ae0
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Table Editor / CapabilityManifest
 * PURPOSE: Declares what Table Editor can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Table Editor]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker visualtableeditor-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `field` conformance: the handle exposes getValue and setValue
 * (ADR-134), so the canvas can read and set its value, and the conformance
 * suite verifies that contract. `field` is also the level the suite computes
 * this component requires (ADR-219). Promoted from `display` on 2026-10-25,
 * when the suite showed it already met that level.
 */
export const VISUALTABLEEDITOR_MANIFEST: CapabilityManifest =
{
    name: "visualtableeditor",
    factory: "createVisualTableEditor",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Table Editor",
    icon: "bi-table",
    category: "data",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    regions: ["visualtableeditor:table-container"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 40341, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 300, h: 150 },
    defaultOptions: {},

    conformance: "field",
    priority: 50,
};
