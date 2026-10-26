/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 34281f1f-ebbd-4ce2-be90-5ef017e5c337
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: LaTeX Editor / CapabilityManifest
 * PURPOSE: Declares what LaTeX Editor can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[LaTeX Editor]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker latexeditor-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `field` conformance: the handle exposes getValue and setValue
 * (ADR-134), so the canvas can read and set its value, and the conformance
 * suite verifies that contract. `field` is also the level the suite computes
 * this component requires (ADR-219). Promoted from `display` on 2026-10-25,
 * when the suite showed it already met that level.
 */
export const LATEXEDITOR_MANIFEST: CapabilityManifest =
{
    name: "latexeditor",
    factory: "createLatexEditor",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "LaTeX Editor",
    icon: "bi-subscript",
    category: "content",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    regions: [
        "latexeditor:preview",
        "latexeditor:palette-tabs",
        "latexeditor:palette-grid",
    ],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 20737, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 400, h: 300 },
    defaultOptions: {},

    conformance: "field",
    priority: 50,
};
