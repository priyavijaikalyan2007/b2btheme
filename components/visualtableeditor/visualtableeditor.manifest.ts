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
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
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

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 40341, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 300, h: 150 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
